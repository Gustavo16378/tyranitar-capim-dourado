// Os ids fixos do seed (scripts/lib/ids-do-seed.mjs): o demo:reset separa o que é do seed do que
// os ensaios criaram por eles. Se um nome mudar, o id muda, e o reset apagaria o histórico da Ana
// em produção como se fosse ensaio. Os valores abaixo são os que estão no D1 de produção.
import { describe, expect, it } from 'vitest'
import { CUPONS_DO_SEED, HISTORICO_DA_ANA, idDoCupom, PONTOS_DA_ANA } from '../../scripts/lib/ids-do-seed.mjs'

describe('ids do seed', () => {
  it('as 6 compras do histórico da Ana somam 2.140 pontos, com os ids de produção', () => {
    expect(PONTOS_DA_ANA).toBe(2140)
    expect(HISTORICO_DA_ANA.map((c) => c.id)).toEqual([
      '39d5e168-727e-5814-9f8a-160fa80191f4',
      'c78603b8-2d06-57ed-9e2b-004680ea6c5c',
      '58890177-f6e1-5961-aa91-4aefb9910444',
      'f15148cb-9001-55cc-8cc5-f7f461e70afd',
      '8afd629b-8dc1-58c3-bc0c-eceb54b2e9e4',
      '0fb2f3dc-319b-50de-81c3-59cfd40f8ee4',
    ])
  })

  it('os 4 cupons do seed têm os ids de produção', () => {
    expect(CUPONS_DO_SEED.map(idDoCupom)).toEqual([
      'a3a0c369-b7ef-5513-81f1-f0f84a3cc46e',
      '1043ccc2-2661-5028-a49e-c3d69a681887',
      '14fc2e43-2844-57d3-8d91-520bebc9289d',
      'a07dae7c-311c-5312-b2ee-59b87bb9b0a0',
    ])
  })
})
