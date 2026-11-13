// Mock de GET /api/ofertas: cupons ativos das lojas e do shopping, já filtrados para a Ana.
import type { Lista, Oferta } from '../../tipos'
import { responder } from './atraso'

export const OFERTAS: Oferta[] = [
  {
    id: 'cp1',
    titulo: '10% em calçados',
    tipo: 'PERCENTUAL',
    valor: 10,
    origem: 'LOJA',
    loja: { id: 'l-esportes', nome: 'Loja de esportes', mapaId: 'loja-esportes' },
    categoriaAlvo: 'calcados',
    nivelMinimo: 'SEMENTE',
    validade: '2026-12-31',
    destaque: true,
  },
  {
    id: 'cp3',
    titulo: 'Estacionamento grátis',
    tipo: 'BRINDE',
    valor: 0,
    origem: 'SHOPPING',
    loja: null,
    categoriaAlvo: null,
    nivelMinimo: 'CAPIM',
    validade: '2026-11-30',
    destaque: false,
  },
  {
    id: 'cp4',
    titulo: '15% em perfumes',
    tipo: 'PERCENTUAL',
    valor: 15,
    origem: 'LOJA',
    loja: { id: 'l-perfumaria', nome: 'Perfumaria', mapaId: 'loja-perfumaria' },
    categoriaAlvo: null,
    nivelMinimo: 'BROTO',
    validade: '2026-12-20',
    destaque: false,
  },
]

export function listarOfertas(): Promise<Lista<Oferta>> {
  return responder({ itens: OFERTAS, total: OFERTAS.length })
}
