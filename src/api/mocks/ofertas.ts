// Mock de GET /api/ofertas: cupons ativos das lojas e do shopping, já filtrados para a Ana.
import type { Cupom, Lista } from '../../tipos'
import { responder } from './atraso'

export const OFERTAS: Cupom[] = [
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
    id: 'cp3',
    titulo: 'Estacionamento grátis',
    loja: null,
    validade: '2026-11-30',
    tipo: 'BRINDE',
    valor: 0,
    nivelMinimo: 'CAPIM',
  },
  {
    id: 'cp4',
    titulo: '15% em perfumes',
    loja: 'Perfumaria',
    validade: '2026-12-20',
    tipo: 'PERCENTUAL',
    valor: 15,
    nivelMinimo: 'BROTO',
  },
]

export function listarOfertas(): Promise<Lista<Cupom>> {
  return responder({ itens: OFERTAS, total: OFERTAS.length })
}
