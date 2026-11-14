// O loop de tool use da Capi (docs/arquitetura.md): manda a conversa e as ferramentas ao
// Claude, executa no D1 as ferramentas que ele pedir e devolve os resultados, até ele responder
// em texto. Tudo dentro do prazo de 15 s; passou disso ou o Claude falhou, 503 IA_INDISPONIVEL.
import type Anthropic from '@anthropic-ai/sdk'
import { ErroApi } from '../erros'
import { salvarMensagem, ultimasMensagens, type MensagemLinha } from '../repo/mensagens'
import { produtoParaApi, type ProdutoLinha } from '../repo/produtos'
import {
  acharRespostaSalva,
  produtosDaRespostaSalva,
  RESPOSTA_SALVA_SEM_PRODUTO,
  sha256DaImagem,
  type RespostaSalva,
} from './demonstracao'
import type { TipoDeImagem } from './entrada'
import { executarFerramenta, FERRAMENTAS, paraOModelo, type Acao, type ContextoDasFerramentas } from './ferramentas'
import type { ModeloCapi, ParametrosDoModelo } from './modelo'
import { lerPaginaDeProduto, palavrasDoEndereco, type DadosDaPagina, type LerPagina } from './pagina'
import {
  MAXIMO_DE_VOLTAS,
  MENSAGENS_NO_CONTEXTO,
  MODELO_PADRAO,
  MODELOS_COM_FALLBACK,
  PRAZO_MS,
  RESPOSTA_RECUSA,
  RESPOSTA_SEM_TEXTO,
  SISTEMA,
} from './prompt'

type Mensagem = Anthropic.Beta.BetaMessageParam

export interface PedidoDaCapi {
  clienteId: string
  texto: string
  /** Foto ou print do cliente (RF03). */
  imagem?: { tipo: TipoDeImagem; base64: string }
  /** Link de um produto (RF04). */
  link?: string
}

export interface RespostaDaCapi {
  resposta: string
  produtos: ReturnType<typeof produtoParaApi>[]
  acoes: Acao[]
}

export interface DependenciasDaCapi {
  db: D1Database
  /** null quando não há chave da API: a Capi responde como indisponível. */
  modelo: ModeloCapi | null
  nomeDoModelo?: string
  agora?: Date
  prazoMs?: number
  /** Como abrir a página de um link; os testes passam uma página de exemplo. */
  lerPagina?: LerPagina
  /** CAPI_MODO_DEMO=1: usa a resposta salva sempre que a mensagem bater com uma. */
  modoDemo?: boolean
  /** Respostas salvas (padrão: demonstracao.json). */
  respostasSalvas?: RespostaSalva[]
}

const CARTOES_NO_MAXIMO = 3
const MARCA_DE_PRODUTO = /\[produto:([^\]\s]+)\]/g

/** Os ids das marcas [produto:ID] do texto, na ordem, sem repetir. */
export function idsCitados(texto: string) {
  return [...new Set([...texto.matchAll(MARCA_DE_PRODUTO)].map((m) => m[1]))]
}

/**
 * A mensagem do cliente com foto fica no histórico como "[foto: descrição] texto": a imagem não é
 * guardada, mas a descrição que a Capi fez dela é, para as próximas mensagens saberem do que se
 * trata. "[foto]" sem descrição é das mensagens gravadas antes disso.
 */
const MARCA_DE_FOTO = /^\[foto(?::\s*([^\]]*))?\]\s*/

/** A mensagem do cliente gravada: o texto, se tinha foto e a descrição dela. */
export function lerMensagemDoCliente(conteudo: string) {
  const marca = conteudo.match(MARCA_DE_FOTO)
  if (!marca) return { texto: conteudo, foto: false, descricaoDaFoto: null }
  return { texto: conteudo.slice(marca[0].length), foto: true, descricaoDaFoto: marca[1]?.trim() || null }
}

/** Como a mensagem do cliente volta para o Claude: a foto, que não é reenviada, pela descrição dela. */
export function mensagemDoClienteParaOModelo(conteudo: string) {
  const { texto, foto, descricaoDaFoto } = lerMensagemDoCliente(conteudo)
  if (!foto) return conteudo
  const aviso = descricaoDaFoto
    ? `[Foto que o cliente mandou nesta mensagem. Você viu a foto e a descreveu assim: ${descricaoDaFoto}. A imagem não é reenviada.]`
    : '[Foto que o cliente mandou nesta mensagem. Você viu a foto na hora; a imagem não é reenviada.]'
  return texto ? `${aviso}\n${texto}` : aviso
}

/** O texto sem as marcas [produto:ID] (o app mostra cartões no lugar delas). */
export function semMarcasDeProduto(texto: string) {
  return texto.replace(MARCA_DE_PRODUTO, '').replace(/[ \t]+([.,;:!?])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim()
}

export function iaIndisponivel() {
  return new ErroApi('IA_INDISPONIVEL', 'A Capi não conseguiu responder agora. Use a busca do app enquanto isso.')
}

function parametros(nomeDoModelo: string, mensagens: Mensagem[]): ParametrosDoModelo {
  return {
    model: nomeDoModelo,
    max_tokens: 16000,
    system: [{ type: 'text', text: SISTEMA }],
    tools: FERRAMENTAS,
    messages: mensagens,
    // Chat: esforço baixo responde rápido; o cache guarda o prefixo (ferramentas, sistema, conversa).
    output_config: { effort: 'low' },
    cache_control: { type: 'ephemeral' },
    // Se o modelo recusar por precaução, o servidor tenta de novo num modelo alternativo.
    ...(MODELOS_COM_FALLBACK.has(nomeDoModelo) ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
  }
}

/** Uma resposta da Capi e as consultas que ela fez para chegar nela. */
interface Turno {
  resposta: RespostaDaCapi
  /**
   * As chamadas de ferramenta e os resultados, na ordem, sem os blocos de raciocínio. Vão para o
   * histórico: na próxima mensagem, o Claude sabe de que produtos se está falando.
   */
  troca: Mensagem[]
}

function lerTroca(troca: string | null): Mensagem[] {
  if (!troca) return []
  try {
    const lista: unknown = JSON.parse(troca)
    return Array.isArray(lista) ? soFerramentasDeHoje(lista as Mensagem[]) : []
  } catch {
    return []
  }
}

const FERRAMENTAS_DE_HOJE = new Set(FERRAMENTAS.map((f) => f.name))

/**
 * Tira do histórico as chamadas a ferramentas que a Capi não tem mais (como a reservar, das
 * conversas antigas) e os resultados delas; a mensagem que fica vazia sai junto. Assim o modelo
 * não vê uma ferramenta que não existe na lista de hoje.
 */
function soFerramentasDeHoje(troca: Mensagem[]): Mensagem[] {
  const fora = new Set<string>()
  for (const m of troca) {
    if (!Array.isArray(m.content)) continue
    for (const b of m.content) if (b.type === 'tool_use' && !FERRAMENTAS_DE_HOJE.has(b.name)) fora.add(b.id)
  }
  if (!fora.size) return troca
  return troca.flatMap((m): Mensagem[] => {
    if (!Array.isArray(m.content)) return [m]
    const content = m.content.filter(
      (b) => !((b.type === 'tool_use' && fora.has(b.id)) || (b.type === 'tool_result' && fora.has(b.tool_use_id))),
    )
    return content.length ? [{ ...m, content } as Mensagem] : []
  })
}

/**
 * Histórico do banco no formato da API: cada pergunta do cliente, as consultas que a Capi fez
 * (chamadas de ferramenta e resultados) e a resposta dela; no fim, a mensagem nova. Os blocos de
 * raciocínio dos turnos passados não voltam: tirar todos não invalida nada, e o histórico fica
 * igual de uma mensagem para outra (o cache do prompt continua valendo).
 */
function montarConversa(anteriores: MensagemLinha[], conteudoNovo: Anthropic.Beta.BetaContentBlockParam[]) {
  // A janela pode começar no meio de uma troca: as respostas da Capi sem a pergunta ficam de fora.
  const desde = anteriores.findIndex((m) => m.papel === 'CLIENTE')
  const mensagens: Mensagem[] = []
  for (const m of desde < 0 ? [] : anteriores.slice(desde)) {
    if (m.papel === 'CLIENTE') mensagens.push({ role: 'user', content: mensagemDoClienteParaOModelo(m.conteudo) })
    else mensagens.push(...lerTroca(m.troca), { role: 'assistant', content: m.conteudo })
  }
  mensagens.push({ role: 'user', content: conteudoNovo })
  return mensagens
}

/** Os blocos do turno que vão para o histórico: texto e chamadas de ferramenta, sem raciocínio. */
function paraATroca(conteudo: Anthropic.Beta.BetaContentBlock[]): Anthropic.Beta.BetaContentBlockParam[] {
  return conteudo.flatMap((bloco): Anthropic.Beta.BetaContentBlockParam[] => {
    if (bloco.type === 'text') return [{ type: 'text', text: bloco.text }]
    if (bloco.type === 'tool_use') return [{ type: 'tool_use', id: bloco.id, name: bloco.name, input: bloco.input }]
    return []
  })
}

/** Texto final sem as marcas [produto:ID], e os cartões: só produtos que vieram das ferramentas (RN14). */
export function montarResposta(
  texto: string,
  vistos: Map<string, ProdutoLinha>,
  relevantes: ProdutoLinha[],
  acoes: Acao[],
): RespostaDaCapi {
  const citados = idsCitados(texto)
  const limpo = semMarcasDeProduto(texto)
  // Citação de produto que não veio de ferramenta é descartada. Sem citação nenhuma, entram os
  // mais relevantes da última busca por texto.
  const cartoes = citados.length
    ? citados.flatMap((id) => (vistos.has(id) ? [vistos.get(id)!] : []))
    : relevantes
  const produtos = cartoes.slice(0, CARTOES_NO_MAXIMO)
  const todas = [...acoes]
  const disponivel = produtos.find((p) => p.estoque > 0)
  // O cartão com estoque ganha o botão "Reservar" no app (a Capi não reserva sozinha).
  if (disponivel) todas.unshift({ tipo: 'RESERVAR', produtoId: disponivel.id })
  return { resposta: limpo || RESPOSTA_SEM_TEXTO, produtos: produtos.map(produtoParaApi), acoes: todas }
}

function textoDe(resposta: Anthropic.Beta.BetaMessage) {
  return resposta.content
    .flatMap((bloco) => (bloco.type === 'text' ? [bloco.text] : []))
    .join('\n')
    .trim()
}

async function rodarLoop(
  modelo: ModeloCapi,
  nomeDoModelo: string,
  mensagens: Mensagem[],
  ctx: ContextoDasFerramentas,
  signal: AbortSignal,
): Promise<Turno> {
  const vistos = new Map<string, ProdutoLinha>()
  let relevantes: ProdutoLinha[] = []
  const acoes: Acao[] = []
  const troca: Mensagem[] = []
  let ultimoTexto = ''

  for (let volta = 0; volta < MAXIMO_DE_VOLTAS; volta++) {
    let resposta: Anthropic.Beta.BetaMessage
    try {
      resposta = await modelo(parametros(nomeDoModelo, mensagens), { signal })
    } catch (erro) {
      if (!signal.aborted) console.error('A chamada ao Claude falhou:', erro)
      throw iaIndisponivel()
    }
    if (resposta.stop_reason === 'refusal') return { resposta: { resposta: RESPOSTA_RECUSA, produtos: [], acoes: [] }, troca: [] }

    // O turno do assistente volta inteiro (com os blocos de raciocínio), sem edição.
    mensagens.push({ role: 'assistant', content: resposta.content })
    ultimoTexto = textoDe(resposta) || ultimoTexto
    if (resposta.stop_reason === 'pause_turn') continue

    const chamadas = resposta.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use')
    if (resposta.stop_reason !== 'tool_use' || chamadas.length === 0) break

    // Uma de cada vez (a reserva mexe no estoque); todos os resultados voltam numa mensagem só.
    const resultados: Anthropic.Beta.BetaToolResultBlockParam[] = []
    for (const chamada of chamadas) {
      if (signal.aborted) throw iaIndisponivel()
      const r = await executarFerramenta(chamada.name, chamada.input, ctx)
      for (const p of r.produtos ?? []) vistos.set(p.id, p)
      if (r.relevantes && r.produtos?.length) relevantes = r.produtos
      if (r.acao) acoes.push(r.acao)
      resultados.push({
        type: 'tool_result',
        tool_use_id: chamada.id,
        content: JSON.stringify(r.conteudo),
        ...(r.erro ? { is_error: true } : {}),
      })
    }
    mensagens.push({ role: 'user', content: resultados })
    troca.push({ role: 'assistant', content: paraATroca(resposta.content) }, { role: 'user', content: resultados })
  }

  return { resposta: montarResposta(ultimoTexto, vistos, relevantes, acoes), troca }
}

/** Corre `tarefa` com um prazo: depois dele, aborta e responde IA_INDISPONIVEL. */
async function comPrazo<T>(ms: number, tarefa: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controle = new AbortController()
  let relogio: ReturnType<typeof setTimeout> | undefined
  const estouro = new Promise<never>((_, rejeitar) => {
    relogio = setTimeout(() => {
      controle.abort()
      rejeitar(iaIndisponivel())
    }, ms)
  })
  try {
    return await Promise.race([tarefa(controle.signal), estouro])
  } finally {
    clearTimeout(relogio)
  }
}

function descreverPagina(pagina: DadosDaPagina | null, link: string) {
  if (!pagina) {
    const palavras = palavrasDoEndereco(link)
    return palavras
      ? `O cliente mandou o link ${link}, mas a página não abriu (muitas lojas bloqueiam a leitura). ` +
          `As palavras do endereço dizem o produto: "${palavras}". Procure o mesmo item ou parecidos no shopping ` +
          'com buscar_similares por elas. Só se não der para saber o que é, peça ao cliente o nome do produto.'
      : `O cliente mandou o link ${link}, mas não consegui abrir a página. Peça a ele o nome do produto.`
  }
  const preco = pagina.preco ? `${pagina.moeda && pagina.moeda !== 'BRL' ? `${pagina.moeda} ` : 'R$ '}${pagina.preco}` : null
  return [
    `O cliente mandou o link de um produto de outra loja: ${link}`,
    pagina.titulo && `Título da página: ${pagina.titulo}`,
    preco && `Preço na página: ${preco}`,
    pagina.descricao && `Descrição: ${pagina.descricao.slice(0, 300)}`,
    'Procure o mesmo item ou parecidos no shopping com buscar_similares.',
  ]
    .filter(Boolean)
    .join('\n')
}

/** O conteúdo da mensagem nova: a foto ou a página do link, e o texto do cliente. */
async function conteudoDoPedido(pedido: PedidoDaCapi, lerPagina: LerPagina, signal: AbortSignal) {
  const blocos: Anthropic.Beta.BetaContentBlockParam[] = []
  let texto = pedido.texto
  if (pedido.imagem) {
    blocos.push({ type: 'image', source: { type: 'base64', media_type: pedido.imagem.tipo, data: pedido.imagem.base64 } })
    texto ||= 'Tem isto no shopping?'
  }
  if (pedido.link) {
    const pagina = await lerPagina(pedido.link, signal)
    if (pagina?.imagem?.startsWith('https://')) blocos.push({ type: 'image', source: { type: 'url', url: pagina.imagem } })
    texto = `${descreverPagina(pagina, pedido.link)}\n\nMensagem do cliente: ${pedido.texto || 'Tem isto no shopping?'}`
  }
  blocos.push({ type: 'text', text: texto })
  return blocos
}

/**
 * Como a resposta da Capi fica no histórico: o texto e as marcas dos produtos mostrados. Sem as
 * marcas, na mensagem seguinte o Claude via um produto oferecido sem consulta (as respostas
 * salvas não passam por ferramenta) e pedia desculpas por isso. GET /api/chat tira as marcas.
 */
function respostaParaOHistorico(resposta: RespostaDaCapi) {
  return [resposta.resposta, ...resposta.produtos.map((p) => `[produto:${p.id}]`)].join(' ')
}

const TAMANHO_DA_DESCRICAO = 300

/**
 * O que a Capi viu na foto, para o histórico: o que ela mandou procurar em buscar_similares (a
 * descrição, a cor, a marca e o estilo do item), a descrição da resposta salva do roteiro, a busca
 * que ela fez ou, sem nenhuma consulta, a primeira frase da resposta.
 */
function descreverAFoto(turno: Turno, salva: RespostaSalva | undefined) {
  const consultas = turno.troca.flatMap((m) =>
    m.role === 'assistant' && Array.isArray(m.content)
      ? m.content.filter((b): b is Anthropic.Beta.BetaToolUseBlockParam => b.type === 'tool_use')
      : [],
  )
  const entrada = (nome: string) => consultas.find((c) => c.name === nome)?.input as Record<string, unknown> | undefined
  const similares = entrada('buscar_similares')
  const busca = entrada('buscar_produtos')
  const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const partes = similares
    ? [
        texto(similares.descricao),
        texto(similares.cor) && `cor ${texto(similares.cor)}`,
        texto(similares.marca) && `marca ${texto(similares.marca)}`,
        texto(similares.estilo) && `estilo ${texto(similares.estilo)}`,
        texto(similares.categoria) && `categoria ${texto(similares.categoria)}`,
      ]
    : salva?.foto
      ? [salva.foto]
      : busca
        ? [texto(busca.texto), texto(busca.categoria) && `categoria ${texto(busca.categoria)}`]
        : [semMarcasDeProduto(turno.resposta.resposta).split(/(?<=[.?!])\s/)[0]]
  const descricao = partes
    .filter(Boolean)
    .join(', ')
    .replace(/[[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return descricao.slice(0, TAMANHO_DA_DESCRICAO) || 'uma foto'
}

/** Como a mensagem do cliente fica no histórico: a foto não é guardada, a descrição dela sim. */
function textoParaOHistorico(pedido: PedidoDaCapi, descricaoDaFoto: string | null) {
  if (pedido.imagem) return `[foto: ${descricaoDaFoto ?? 'uma foto'}] ${pedido.texto}`.trim()
  if (pedido.link) return `${pedido.texto} ${pedido.link}`.trim()
  return pedido.texto
}

/**
 * A resposta salva como resposta da Capi: texto fixo, produtos buscados agora no banco. No
 * histórico, ela entra como a busca que fez (buscar_produtos e o resultado), como se o Claude
 * tivesse consultado: na mensagem seguinte, ele sabe de que produtos se falou.
 */
async function responderComSalva(db: D1Database, salva: RespostaSalva, clienteId: string): Promise<Turno> {
  const encontrados = await produtosDaRespostaSalva(db, salva, clienteId)
  const id = `toolu_salva_${crypto.randomUUID().replaceAll('-', '')}`
  const resultado = encontrados.length
    ? { produtos: encontrados.map(paraOModelo) }
    : { produtos: [], aviso: 'Nenhum produto ativo com esses filtros.' }
  return {
    resposta: montarResposta(encontrados.length ? salva.resposta : RESPOSTA_SALVA_SEM_PRODUTO, new Map(), encontrados, []),
    troca: [
      { role: 'assistant', content: [{ type: 'tool_use', id, name: 'buscar_produtos', input: salva.busca }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: JSON.stringify(resultado) }] },
    ],
  }
}

/** Uma mensagem do cliente para a Capi: grava a conversa e devolve resposta, cartões e ações. */
export async function conversar(pedido: PedidoDaCapi, deps: DependenciasDaCapi): Promise<RespostaDaCapi> {
  const { db } = deps
  const anteriores = await ultimasMensagens(db, pedido.clienteId, MENSAGENS_NO_CONTEXTO)

  const imagemSha256 = pedido.imagem ? await sha256DaImagem(pedido.imagem.base64) : undefined
  if (imagemSha256 && deps.modoDemo) console.log(`Capi (modo demonstração): foto recebida, SHA-256 ${imagemSha256}`)
  const salva = acharRespostaSalva({ texto: pedido.texto, imagemSha256 }, deps.respostasSalvas)

  let turno: Turno
  if (salva && (deps.modoDemo || !deps.modelo)) {
    turno = await responderComSalva(db, salva, pedido.clienteId)
  } else {
    if (!deps.modelo) throw iaIndisponivel()
    const modelo = deps.modelo
    const ctx: ContextoDasFerramentas = {
      db,
      clienteId: pedido.clienteId,
      agora: deps.agora ?? new Date(),
    }
    try {
      // A leitura do link conta dentro dos mesmos 15 s.
      turno = await comPrazo(deps.prazoMs ?? PRAZO_MS, async (signal) => {
        const conteudo = await conteudoDoPedido(pedido, deps.lerPagina ?? lerPaginaDeProduto, signal)
        return rodarLoop(modelo, deps.nomeDoModelo ?? MODELO_PADRAO, montarConversa(anteriores, conteudo), ctx, signal)
      })
    } catch (erro) {
      // Claude fora do ar: se a mensagem é do roteiro da demonstração, responde com a salva.
      if (!(erro instanceof ErroApi && erro.codigo === 'IA_INDISPONIVEL' && salva)) throw erro
      turno = await responderComSalva(db, salva, pedido.clienteId)
    }
  }
  // A pergunta só entra no histórico junto com a resposta: se a Capi falhou (503), a mensagem
  // seguinte não carrega uma pergunta sem resposta, que o Claude responderia de novo.
  const descricaoDaFoto = pedido.imagem ? descreverAFoto(turno, salva ?? undefined) : null
  await salvarMensagem(db, pedido.clienteId, 'CLIENTE', textoParaOHistorico(pedido, descricaoDaFoto))
  await salvarMensagem(
    db,
    pedido.clienteId,
    'CAPI',
    respostaParaOHistorico(turno.resposta),
    turno.troca.length ? JSON.stringify(turno.troca) : null,
  )
  return turno.resposta
}
