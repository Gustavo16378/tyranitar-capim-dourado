// Mock de POST /api/chat até a Capi de verdade (Fase 5). A pergunta do roteiro da demonstração
// (o print do tênis) tem resposta salva; qualquer outra mensagem vira uma busca no catálogo.
import type { MensagemChat, RespostaChat } from '../../tipos'
import { ATRASO_CAPI_MS, responder } from './atraso'
import { acharProduto, buscar, resumo } from './produtos'

/** A mensagem que abre o roteiro da demonstração. */
export const PERGUNTA_DEMO = {
  texto: 'Tem esse tênis aí no shopping? Uso 42.',
  anexo: 'Print de um tênis preto',
}

function respostaDemo(): RespostaChat {
  const produtos = ['p-pulse', 'p-run'].flatMap((id) => {
    const p = acharProduto(id)
    return p ? [resumo(p)] : []
  })
  return {
    resposta:
      'Achei dois parecidos aqui no térreo, os dois com o seu número.\n\n' +
      'O Pulse está nas últimas unidades. Quer que eu separe um para você?',
    produtos,
    acoes: [
      { tipo: 'RESERVAR', produtoId: 'p-pulse' },
      { tipo: 'ROTA', mapaId: 'loja-esportes', piso: 1 },
    ],
  }
}

function respostaBusca(texto: string): RespostaChat {
  const { itens } = buscar({ q: texto, tamanho: 3 })
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

export function enviarMensagem({ texto }: MensagemChat): Promise<RespostaChat> {
  const resposta = texto === PERGUNTA_DEMO.texto ? respostaDemo() : respostaBusca(texto)
  return responder(resposta, ATRASO_CAPI_MS)
}
