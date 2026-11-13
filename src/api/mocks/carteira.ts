// Mock de GET /api/me/carteira: a Ana, nível Capim, 2.140 pontos, como no seed.
import type { Carteira } from '../../tipos'
import { responder } from './atraso'
import { RESERVAS } from './reservas'

/** Estado da carteira. O registro de compra do painel da loja (Fase 4) soma pontos aqui. */
export const CARTEIRA = {
  qrToken: 'q-7f3a-ana-demo',
  pontos: 2140,
}

const ATIVAS = new Set(['PENDENTE', 'CONFIRMADA', 'SEPARADA'])

export function obterCarteira(): Promise<Carteira> {
  return responder({
    qrToken: CARTEIRA.qrToken,
    pontos: CARTEIRA.pontos,
    nivel: 'CAPIM',
    proximoNivel: { nivel: 'DOURADO', faltam: Math.max(0, 5000 - CARTEIRA.pontos) },
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
    reservasAtivas: RESERVAS.filter((r) => ATIVAS.has(r.status)).map(({ id, produto, status }) => ({
      id,
      produto,
      status,
    })),
  })
}
