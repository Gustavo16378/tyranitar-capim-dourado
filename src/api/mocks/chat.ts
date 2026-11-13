// Mock de POST /api/chat, no contrato da Capi do docs/api.md (o mesmo da Fase 5 na main).
// - A pergunta do roteiro da demonstração (o print do tênis) tem resposta pronta.
// - Foto: o mock não enxerga; responde como às fotos do pitch, com os tênis do catálogo.
// - Link: busca pelas palavras do endereço do produto (o servidor de verdade lê a página).
// - Texto: busca no catálogo.
// Os produtos vêm do catálogo da fonte atual (src/api/produtos), como as ferramentas da Capi
// buscam no banco: com produtos já na API real, os cards abrem produtos que existem.
import type { AcaoChat, HistoricoChat, MensagemChat, ProdutoResumo, RespostaChat } from '../../tipos'
import { IMAGEM_MAXIMA_BYTES, tamanhoDoBase64, TEXTO_MAXIMO, TIPOS_DE_IMAGEM } from '../limites'
import { linkValido, termosDoLink } from '../link'
import { listarProdutos } from '../produtos'
import { ATRASO_CAPI_MS, falhar, responder } from './atraso'

/** A mensagem que abre o roteiro da demonstração: o texto e o print do tênis (public/demo). */
export const PERGUNTA_DEMO = {
  texto: 'Tem esse tênis aí no shopping? Uso 42.',
  /** O print que vai junto, como foto: a Capi de verdade precisa ver o tênis. */
  imagem: '/demo/print-tenis.jpg',
  /** Descrição do print, se ele não carregar. */
  anexo: 'Print de um tênis preto',
}

const PERGUNTA_RESERVA = 'Quer que eu separe um para você?'
const SEM_PRODUTO = 'Não achei nada parecido nas lojas do shopping agora. Quer que eu procure outra coisa?'

/** "Tênis de corrida Pulse" → "Pulse" (a marca no fim do nome); sem marca, o nome em minúsculas. */
function apelido(nome: string) {
  const ultima = nome.trim().split(/\s+/).at(-1) ?? nome
  return /^\p{Lu}/u.test(ultima) && ultima !== nome.trim() ? ultima : nome.charAt(0).toLowerCase() + nome.slice(1)
}

function nomeDoPiso(piso: ProdutoResumo['loja']['piso']) {
  return piso === 1 ? 'térreo' : '2º piso'
}

/** RESERVAR para o primeiro cartão com estoque e a ROTA até a loja do primeiro. */
function acoesPara(produtos: ProdutoResumo[]): AcaoChat[] {
  const [primeiro] = produtos
  if (!primeiro) return []
  const disponivel = produtos.find((p) => p.estoque > 0)
  const { id: lojaId, mapaId, piso } = primeiro.loja
  return [
    ...(disponivel ? [{ tipo: 'RESERVAR' as const, produtoId: disponivel.id }] : []),
    { tipo: 'ROTA', lojaId, mapaId, piso },
  ]
}

/** O que o servidor confere em lerEntradaDoChat: devolve a mensagem de erro, ou null. */
function problemaNaMensagem({ texto, imagem, link }: MensagemChat): string | null {
  if (texto.trim().length > TEXTO_MAXIMO) return `A mensagem aceita até ${TEXTO_MAXIMO} caracteres.`
  if (imagem && link) return 'Mande a foto ou o link, um de cada vez.'
  if (!texto.trim() && !imagem && !link) return 'Escreva uma mensagem para a Capi.'
  if (imagem && !TIPOS_DE_IMAGEM.includes(imagem.tipo)) return 'A foto precisa ser JPEG, PNG, WebP ou GIF.'
  if (imagem && tamanhoDoBase64(imagem.base64) > IMAGEM_MAXIMA_BYTES)
    return 'A foto passa de 4 MB. Mande uma foto menor.'
  if (link && !linkValido(link)) return 'O link precisa começar com http ou https.'
  return null
}

async function respostaDemo(): Promise<RespostaChat> {
  const { itens } = await listarProdutos({ q: 'tênis', tamanho: 2 })
  if (itens.length === 0) return respostaBusca(PERGUNTA_DEMO.texto)
  const [primeiro] = itens
  const onde = itens.every((p) => p.loja.piso === primeiro.loja.piso)
    ? `aqui no ${nomeDoPiso(primeiro.loja.piso)}`
    : 'aqui no shopping'
  const achei =
    itens.length === 1
      ? `Achei um parecido ${onde}, com o seu número.`
      : `Achei dois parecidos ${onde}, os dois com o seu número.`
  const ultimas = primeiro.estoque <= 2 ? `O ${apelido(primeiro.nome)} está nas últimas unidades. ` : ''
  return {
    // Parágrafos separados por linha em branco: a tela mostra cada um num balão.
    resposta: `${achei}\n\n${ultimas}${PERGUNTA_RESERVA}`,
    produtos: itens,
    acoes: acoesPara(itens),
  }
}

async function respostaFoto(): Promise<RespostaChat> {
  const { itens } = await listarProdutos({ q: 'tênis', tamanho: 3 })
  if (itens.length === 0) return { resposta: SEM_PRODUTO, produtos: [], acoes: [] }
  return {
    resposta: `Achei estes parecidos aqui no shopping. ${PERGUNTA_RESERVA}`,
    produtos: itens,
    acoes: acoesPara(itens),
  }
}

async function respostaLink(link: string): Promise<RespostaChat> {
  const termos = termosDoLink(link)
  const { itens } = termos ? await listarProdutos({ q: termos, tamanho: 3 }) : { itens: [] }
  if (itens.length === 0) return { resposta: SEM_PRODUTO, produtos: [], acoes: [] }
  return {
    resposta: `Achei parecidos com o produto do link aqui no shopping. ${PERGUNTA_RESERVA}`,
    produtos: itens,
    acoes: acoesPara(itens),
  }
}

async function respostaBusca(texto: string): Promise<RespostaChat> {
  const { itens } = await listarProdutos({ q: texto, tamanho: 3 })
  if (itens.length === 0) {
    return {
      resposta: 'Não achei isso nas lojas do shopping. Tente com outras palavras, como o tipo do produto ou a cor.',
      produtos: [],
      acoes: [],
    }
  }
  return {
    resposta: itens.length === 1 ? 'Achei este aqui no shopping.' : `Achei ${itens.length} opções aqui no shopping.`,
    produtos: itens,
    acoes: acoesPara(itens),
  }
}

export async function enviarMensagem(mensagem: MensagemChat): Promise<RespostaChat> {
  const problema = problemaNaMensagem(mensagem)
  if (problema) return falhar(400, 'DADOS_INVALIDOS', problema)
  const texto = mensagem.texto.trim()
  const resposta = mensagem.imagem
    ? await respostaFoto()
    : mensagem.link
      ? await respostaLink(mensagem.link)
      : texto === PERGUNTA_DEMO.texto
        ? await respostaDemo()
        : await respostaBusca(texto)
  return responder(resposta, ATRASO_CAPI_MS)
}

/** O mock não guarda a conversa: a Capi abre vazia. */
export async function obterConversa(): Promise<HistoricoChat> {
  return responder({ itens: [], total: 0 }, 0)
}

export async function apagarConversa() {
  return responder({ apagadas: 0 }, 0)
}
