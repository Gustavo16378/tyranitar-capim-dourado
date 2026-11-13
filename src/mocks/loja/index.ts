/// <reference types="vite/client" />
// Mocks da API do painel da loja, no formato de docs/api.md.
//
// Como trocar pela API real: quando a rota existir em functions/, apague a linha dela em
// ROTAS_MOCKADAS. O cliente HTTP (src/loja/api/http.ts) passa a chamar a API sozinho.
// Quando a tabela ficar vazia, apague esta pasta e o bloco "if (MOCKS_LIGADOS)" do http.ts.
//
// Ordem segura: o login primeiro. As rotas mockadas aceitam o token real (só leem o
// perfil), mas a API real recusa o token do mock.
import { entrar } from './auth'
import { buscarAtendimento, calcularPrevia, registrarCompra } from './atendimento'
import { criarCupom, listarCupons } from './cupons'
import { criarProduto, editarProduto, importarProdutos, listarProdutos } from './produtos'
import { listarReservas, mudarStatusReserva } from './reservas'
import type { Manipulador } from './resposta'

export { reiniciarMocks } from './dados'

export const ROTAS_MOCKADAS: Record<string, Manipulador> = {
  'POST /api/auth/login': entrar,
  'GET /api/loja/atendimento/:qr': buscarAtendimento,
  'POST /api/loja/atendimento/previa': calcularPrevia,
  'POST /api/loja/compras': registrarCompra,
  'GET /api/loja/reservas': listarReservas,
  'PATCH /api/loja/reservas/:id': mudarStatusReserva,
  'GET /api/loja/produtos': listarProdutos,
  'POST /api/loja/produtos': criarProduto,
  'PUT /api/loja/produtos/:id': editarProduto,
  'POST /api/loja/produtos/importar': importarProdutos,
  'GET /api/loja/cupons': listarCupons,
  'POST /api/loja/cupons': criarCupom,
}

/** Demora de uma rede de verdade, para os estados de carregando aparecerem. */
const ATRASO_MS = import.meta.env.MODE === 'test' ? 0 : 350

/** Casa 'GET /api/loja/reservas/:id' com GET /api/loja/reservas/r1 e devolve { id: 'r1' }. */
function casar(rota: string, metodo: string, caminho: string): Record<string, string> | null {
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

export interface PedidoHttp {
  metodo: string
  /** Caminho com a busca: /api/loja/reservas?status=SEPARADA */
  url: string
  /** Corpo como vai pela rede: JSON, ou texto (CSV) quando o tipo não é JSON. */
  corpo?: string
  /** Content-Type do corpo. Sem ele, JSON. */
  tipo?: string
  token: string | null
}

/** Responde como a API se a rota estiver mockada; senão devolve null e o http.ts chama a API. */
export async function responderMock({ metodo, url, corpo, tipo, token }: PedidoHttp): Promise<Response | null> {
  const endereco = new URL(url, 'http://mock.local')
  for (const [rota, manipular] of Object.entries(ROTAS_MOCKADAS)) {
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

function paraResponse(status: number, corpo: unknown) {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
