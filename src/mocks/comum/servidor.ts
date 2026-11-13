/// <reference types="vite/client" />
// O "servidor" de mentira de um painel: recebe o pedido como iria pela rede, acha a rota na
// tabela do painel (src/mocks/<painel>/index.ts) e devolve uma Response como a da API.
// Rota fora da tabela devolve null, e o cliente HTTP chama a API de verdade.
import type { MocksDoPainel, PedidoHttp } from '../../painel/api/http'
import type { Manipulador } from './resposta'

/** Demora de uma rede de verdade, para os estados de carregando aparecerem. */
const ATRASO_MS = import.meta.env.MODE === 'test' ? 0 : 350

/** Casa 'GET /api/loja/reservas/:id' com GET /api/loja/reservas/r1 e devolve { id: 'r1' }. */
export function casar(rota: string, metodo: string, caminho: string): Record<string, string> | null {
  const [metodoDaRota, padrao] = rota.split(' ')
  if (metodoDaRota !== metodo) return null
  const partesDoPadrao = padrao.split('/')
  const partes = caminho.split('/')
  if (partesDoPadrao.length !== partes.length) return null
  const params: Record<string, string> = {}
  for (const [i, parte] of partesDoPadrao.entries()) {
    if (parte.startsWith(':')) params[parte.slice(1)] = decodeURIComponent(partes[i])
    else if (parte !== partes[i]) return null
  }
  return params
}

/** Monta o responderMock de um painel a partir da tabela de rotas mockadas dele. */
export function criarResponderMock(rotas: Record<string, Manipulador>): MocksDoPainel['responderMock'] {
  return async function responderMock({ metodo, url, corpo, tipo, token }: PedidoHttp) {
    const endereco = new URL(url, 'http://mock.local')
    for (const [rota, manipular] of Object.entries(rotas)) {
      const params = casar(rota, metodo, endereco.pathname)
      if (!params) continue

      if (ATRASO_MS) await new Promise((fim) => setTimeout(fim, ATRASO_MS))
      let lido: unknown
      try {
        lido = corpo === undefined || (tipo && !tipo.includes('json')) ? corpo : JSON.parse(corpo)
      } catch {
        return paraResponse(400, { status: 400, erro: 'DADOS_INVALIDOS', mensagem: 'O corpo não é um JSON válido.' })
      }
      const resposta = manipular({ metodo, params, busca: endereco.searchParams, corpo: lido, token })
      return paraResponse(resposta.status, resposta.corpo)
    }
    return null
  }
}

function paraResponse(status: number, corpo: unknown) {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
