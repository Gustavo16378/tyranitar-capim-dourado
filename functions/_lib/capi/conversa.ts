// O loop de tool use da Capi (docs/arquitetura.md): manda a conversa e as ferramentas ao
// Claude, executa no D1 as ferramentas que ele pedir e devolve os resultados, até ele responder
// em texto. Tudo dentro do prazo de 15 s; passou disso ou o Claude falhou, 503 IA_INDISPONIVEL.
import type Anthropic from '@anthropic-ai/sdk'
import { ErroApi } from '../erros'
import { salvarMensagem, ultimasMensagens, type MensagemLinha } from '../repo/mensagens'
import { produtoParaApi, type ProdutoLinha } from '../repo/produtos'
import type { TipoDeImagem } from './entrada'
import { executarFerramenta, FERRAMENTAS, type Acao, type ContextoDasFerramentas } from './ferramentas'
import type { ModeloCapi, ParametrosDoModelo } from './modelo'
import { lerPaginaDeProduto, type DadosDaPagina, type LerPagina } from './pagina'
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
}

const CARTOES_NO_MAXIMO = 3
const MARCA_DE_PRODUTO = /\[produto:([^\]\s]+)\]/g

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

/** Histórico do banco no formato da API: começa no cliente e termina com a mensagem nova. */
function montarConversa(anteriores: MensagemLinha[], conteudoNovo: Anthropic.Beta.BetaContentBlockParam[]) {
  const mensagens: Mensagem[] = anteriores.map((m) => ({
    role: m.papel === 'CLIENTE' ? 'user' : 'assistant',
    content: m.conteudo,
  }))
  while (mensagens[0]?.role === 'assistant') mensagens.shift()
  mensagens.push({ role: 'user', content: conteudoNovo })
  return mensagens
}

/** Texto final sem as marcas [produto:ID], e os cartões: só produtos que vieram das ferramentas (RN14). */
export function montarResposta(
  texto: string,
  vistos: Map<string, ProdutoLinha>,
  relevantes: ProdutoLinha[],
  acoes: Acao[],
): RespostaDaCapi {
  const citados = [...new Set([...texto.matchAll(MARCA_DE_PRODUTO)].map((m) => m[1]))]
  const limpo = texto.replace(MARCA_DE_PRODUTO, '').replace(/[ \t]+([.,;:!?])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim()
  // Citação de produto que não veio de ferramenta é descartada. Sem citação nenhuma, entram os
  // mais relevantes da última busca por texto.
  const cartoes = citados.length
    ? citados.flatMap((id) => (vistos.has(id) ? [vistos.get(id)!] : []))
    : relevantes
  const produtos = cartoes.slice(0, CARTOES_NO_MAXIMO)
  const todas = [...acoes]
  const disponivel = produtos.find((p) => p.estoque > 0)
  if (disponivel && !acoes.some((a) => a.tipo === 'RESERVA_CRIADA')) todas.unshift({ tipo: 'RESERVAR', produtoId: disponivel.id })
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
): Promise<RespostaDaCapi> {
  const vistos = new Map<string, ProdutoLinha>()
  let relevantes: ProdutoLinha[] = []
  const acoes: Acao[] = []
  let ultimoTexto = ''

  for (let volta = 0; volta < MAXIMO_DE_VOLTAS; volta++) {
    let resposta: Anthropic.Beta.BetaMessage
    try {
      resposta = await modelo(parametros(nomeDoModelo, mensagens), { signal })
    } catch (erro) {
      if (!signal.aborted) console.error('A chamada ao Claude falhou:', erro)
      throw iaIndisponivel()
    }
    if (resposta.stop_reason === 'refusal') return { resposta: RESPOSTA_RECUSA, produtos: [], acoes: [] }

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
  }

  return montarResposta(ultimoTexto, vistos, relevantes, acoes)
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
  if (!pagina) return `O cliente mandou o link ${link}, mas não consegui abrir a página. Peça a ele o nome do produto.`
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

/** Como a mensagem do cliente fica no histórico (a foto não é guardada). */
function textoParaOHistorico(pedido: PedidoDaCapi) {
  if (pedido.imagem) return `[foto] ${pedido.texto}`.trim()
  if (pedido.link) return `${pedido.texto} ${pedido.link}`.trim()
  return pedido.texto
}

/** Uma mensagem do cliente para a Capi: grava a conversa e devolve resposta, cartões e ações. */
export async function conversar(pedido: PedidoDaCapi, deps: DependenciasDaCapi): Promise<RespostaDaCapi> {
  const { db } = deps
  const anteriores = await ultimasMensagens(db, pedido.clienteId, MENSAGENS_NO_CONTEXTO)
  await salvarMensagem(db, pedido.clienteId, 'CLIENTE', textoParaOHistorico(pedido))
  if (!deps.modelo) throw iaIndisponivel()

  const ctx: ContextoDasFerramentas = {
    db,
    clienteId: pedido.clienteId,
    mensagemDoCliente: pedido.texto,
    agora: deps.agora ?? new Date(),
    reservasFeitas: 0,
  }
  const modelo = deps.modelo
  // A leitura do link conta dentro dos mesmos 15 s.
  const resposta = await comPrazo(deps.prazoMs ?? PRAZO_MS, async (signal) => {
    const conteudo = await conteudoDoPedido(pedido, deps.lerPagina ?? lerPaginaDeProduto, signal)
    return rodarLoop(modelo, deps.nomeDoModelo ?? MODELO_PADRAO, montarConversa(anteriores, conteudo), ctx, signal)
  })
  await salvarMensagem(db, pedido.clienteId, 'CAPI', resposta.resposta)
  return resposta
}
