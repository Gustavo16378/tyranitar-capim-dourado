// Mock de POST /api/chat até a Capi de verdade (Fase 5). A pergunta do roteiro da demonstração
// (o print do tênis) tem resposta pronta; qualquer outra mensagem vira uma busca no catálogo.
// Os produtos vêm do catálogo da fonte atual (src/api/produtos), como as ferramentas da Capi
// vão buscar no banco: com produtos já na API real, os cards abrem produtos que existem.
import type { MensagemChat, ProdutoResumo, RespostaChat } from '../../tipos'
import { listarProdutos } from '../produtos'
import { ATRASO_CAPI_MS, responder } from './atraso'

/** A mensagem que abre o roteiro da demonstração. */
export const PERGUNTA_DEMO = {
  texto: 'Tem esse tênis aí no shopping? Uso 42.',
  anexo: 'Print de um tênis preto',
}

/** "Tênis de corrida Pulse" → "Pulse" (a marca no fim do nome); sem marca, o nome em minúsculas. */
function apelido(nome: string) {
  const ultima = nome.trim().split(/\s+/).at(-1) ?? nome
  return /^\p{Lu}/u.test(ultima) && ultima !== nome.trim() ? ultima : nome.charAt(0).toLowerCase() + nome.slice(1)
}

function nomeDoPiso(piso: ProdutoResumo['loja']['piso']) {
  return piso === 1 ? 'térreo' : '2º piso'
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
    resposta: `${achei}\n\n${ultimas}Quer que eu separe um para você?`,
    produtos: itens,
    acoes: [
      { tipo: 'RESERVAR', produtoId: primeiro.id },
      { tipo: 'ROTA', mapaId: primeiro.loja.mapaId, piso: primeiro.loja.piso },
    ],
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
  const [primeiro] = itens
  return {
    resposta: itens.length === 1 ? 'Achei este aqui no shopping.' : `Achei ${itens.length} opções aqui no shopping.`,
    produtos: itens,
    acoes: [{ tipo: 'ROTA', mapaId: primeiro.loja.mapaId, piso: primeiro.loja.piso }],
  }
}

export async function enviarMensagem({ texto }: MensagemChat): Promise<RespostaChat> {
  const resposta = texto === PERGUNTA_DEMO.texto ? await respostaDemo() : await respostaBusca(texto)
  return responder(resposta, ATRASO_CAPI_MS)
}
