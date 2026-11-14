// Salvos para provar (src/app/agrupar.ts): os salvos agrupados por loja, na ordem do mais recente.
import { describe, expect, it } from 'vitest'
import { agruparPorLoja } from '../../src/app/agrupar'
import type { ProdutoResumo } from '../../src/tipos'

const LOJA_A = { id: 'loja-a', nome: 'Loja A', piso: 1 as const, mapaId: 'mapa-loja-a' }
const LOJA_B = { id: 'loja-b', nome: 'Loja B', piso: 1 as const, mapaId: 'mapa-loja-b' }

const produto = (id: string, loja: ProdutoResumo['loja']): ProdutoResumo => ({
  id,
  nome: id,
  categoria: 'calcados',
  precoCentavos: 1000,
  estoque: 3,
  foto: null,
  loja,
})

describe('agruparPorLoja', () => {
  it('uma loja por grupo, na ordem do salvo mais recente de cada uma', () => {
    // A API manda o mais recente primeiro: o perfume (Loja B) foi o último salvo.
    const grupos = agruparPorLoja([
      produto('perfume', LOJA_B),
      produto('tenis', LOJA_A),
      produto('hidratante', LOJA_B),
      produto('camiseta', LOJA_A),
    ])
    expect(grupos.map((g) => g.loja.id)).toEqual(['loja-b', 'loja-a'])
    expect(grupos[0].produtos.map((p) => p.id)).toEqual(['perfume', 'hidratante'])
    expect(grupos[1].produtos.map((p) => p.id)).toEqual(['tenis', 'camiseta'])
    expect(grupos[1].loja).toEqual(LOJA_A)
  })

  it('sem salvos, nenhum grupo', () => {
    expect(agruparPorLoja([])).toEqual([])
  })
})
