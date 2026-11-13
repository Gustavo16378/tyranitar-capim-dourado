// Mock de GET /api/me/carteira: a Ana, com 2.140 pontos no começo, como no seed.
// Os pontos ficam guardados no aparelho: o registro de compra do painel da loja (Fase 4), mesmo
// em outra aba, soma aqui com creditarPontos, e a carteira mostra os pontos somando.
// No mock, o nível sai do saldo de pontos com os limites padrão (RN08); na API, dos pontos dos
// últimos 12 meses, com os limites da configuração do shopping.
import type { Carteira, NivelApi } from '../../tipos'
import { responder } from './atraso'
import { reservasEmAberto } from './reservas'

const CHAVE = 'mock-carteira'
const QR_TOKEN = 'q-7f3a-ana-demo'
const PONTOS_INICIAIS = 2140

/** Onde cada nível começa (RN08, limites padrão). */
const LIMITES: [NivelApi, number][] = [
  ['SEMENTE', 0],
  ['BROTO', 500],
  ['CAPIM', 2000],
  ['DOURADO', 5000],
]

/** Sem armazenamento (testes, aba anônima), os pontos ficam só aqui. */
let memoria = PONTOS_INICIAIS

export function lerPontos(): number {
  try {
    const guardado = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as { pontos?: unknown } | null
    return typeof guardado?.pontos === 'number' ? guardado.pontos : PONTOS_INICIAIS
  } catch {
    return memoria
  }
}

/** Soma pontos à carteira da Ana (ou tira, com valor negativo). */
export function creditarPontos(pontos: number) {
  const total = Math.max(0, lerPontos() + pontos)
  memoria = total
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ pontos: total }))
  } catch {
    // Fica na memória.
  }
  return total
}

export function nivelDosPontos(pontos: number): NivelApi {
  return LIMITES.filter(([, limite]) => pontos >= limite).at(-1)?.[0] ?? 'SEMENTE'
}

function proximoNivel(pontos: number): Carteira['proximoNivel'] {
  const proximo = LIMITES.find(([, limite]) => limite > pontos)
  return proximo ? { nivel: proximo[0], faltam: proximo[1] - pontos } : null
}

export function obterCarteira(): Promise<Carteira> {
  const pontos = lerPontos()
  return responder({
    qrToken: QR_TOKEN,
    pontos,
    nivel: nivelDosPontos(pontos),
    proximoNivel: proximoNivel(pontos),
    cupons: [
      {
        id: 'cp1',
        titulo: '10% em calçados',
        loja: 'Loja de esportes',
        validade: '2026-12-31',
        tipo: 'PERCENTUAL',
        valor: 10,
        nivelMinimo: 'SEMENTE',
      },
      {
        id: 'cp2',
        titulo: 'R$ 20 em qualquer loja',
        loja: null,
        validade: '2026-12-15',
        tipo: 'VALOR',
        valor: 2000,
        nivelMinimo: 'SEMENTE',
      },
    ],
    reservasAtivas: reservasEmAberto(),
  })
}
