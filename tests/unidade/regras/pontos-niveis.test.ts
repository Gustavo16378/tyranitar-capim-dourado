import { describe, expect, it } from 'vitest'
import { deSqlite, paraSqlite } from '../../../functions/_lib/regras/datas'
import {
  inicioDaJanelaDoNivel,
  lerLimites,
  LIMITES_PADRAO,
  nivelAtende,
  nivelPorPontos,
  proximoNivel,
} from '../../../functions/_lib/regras/niveis'
import { pontosDaCompra } from '../../../functions/_lib/regras/pontos'

describe('pontos (RN07)', () => {
  it('TU01: R$ 399,90 dá 399 pontos, arredondando para baixo', () => {
    expect(pontosDaCompra(39990)).toBe(399)
    expect(pontosDaCompra(99)).toBe(0)
    expect(pontosDaCompra(100)).toBe(1)
  })

  it('TU02: calcula sobre o valor pago, não sobre o bruto', () => {
    const bruto = 45980
    const pago = bruto - 4598 - 2000
    expect(pontosDaCompra(pago)).toBe(393)
    expect(pontosDaCompra(pago)).not.toBe(pontosDaCompra(bruto))
  })

  it('usa os pontos por real da configuração', () => {
    expect(pontosDaCompra(39990, 2)).toBe(799)
  })

  it('recusa valor negativo ou com fração de centavo', () => {
    expect(() => pontosDaCompra(-1)).toThrow(RangeError)
    expect(() => pontosDaCompra(10.5)).toThrow(RangeError)
  })
})

describe('níveis (RN08)', () => {
  it.each([
    [0, 'SEMENTE'],
    [499, 'SEMENTE'],
    [500, 'BROTO'],
    [1999, 'BROTO'],
    [2000, 'CAPIM'],
    [4999, 'CAPIM'],
    [5000, 'DOURADO'],
  ] as const)('TU03: %i pontos é %s', (pontos, nivel) => {
    expect(nivelPorPontos(pontos)).toBe(nivel)
  })

  it('TU04: usa os limites alterados pelo shopping', () => {
    const limites = { SEMENTE: 0, BROTO: 100, CAPIM: 1000, DOURADO: 2000 }
    expect(nivelPorPontos(2140, limites)).toBe('DOURADO')
    expect(nivelPorPontos(150, limites)).toBe('BROTO')
  })

  it('TU05: com 2.140 pontos faltam 2.860 para Dourado; no Dourado nada falta', () => {
    expect(proximoNivel(2140)).toEqual({ nivel: 'DOURADO', limite: 5000, faltam: 2860 })
    expect(proximoNivel(5000)).toBeNull()
    expect(proximoNivel(0)).toEqual({ nivel: 'BROTO', limite: 500, faltam: 500 })
  })

  it('compara nível do cliente com o nível mínimo', () => {
    expect(nivelAtende('CAPIM', 'BROTO')).toBe(true)
    expect(nivelAtende('CAPIM', 'CAPIM')).toBe(true)
    expect(nivelAtende('CAPIM', 'DOURADO')).toBe(false)
  })

  it('conta os pontos dos últimos 12 meses, no formato de data do banco', () => {
    const agora = new Date('2026-11-13T15:04:05.678Z')
    const inicio = inicioDaJanelaDoNivel(agora)
    expect(paraSqlite(inicio)).toBe('2025-11-13 15:04:05')
    // Uma compra gravada por datetime('now') há 13 meses fica fora; há 11 meses, dentro.
    expect('2025-10-13 10:00:00' >= paraSqlite(inicio)).toBe(false)
    expect('2025-12-13 10:00:00' >= paraSqlite(inicio)).toBe(true)
  })

  it('lê e escreve datas no formato do SQLite, em UTC', () => {
    expect(deSqlite('2026-11-13 17:00:00').toISOString()).toBe('2026-11-13T17:00:00.000Z')
    expect(deSqlite(paraSqlite(new Date('2026-01-02T03:04:05Z'))).toISOString()).toBe('2026-01-02T03:04:05.000Z')
  })

  it('lê os limites da configuração e completa o que faltar com o padrão', () => {
    expect(lerLimites({ SEMENTE: 0, BROTO: 500, CAPIM: 2000, DOURADO: 5000 })).toEqual(LIMITES_PADRAO)
    expect(lerLimites({ DOURADO: 8000 })).toEqual({ ...LIMITES_PADRAO, DOURADO: 8000 })
    expect(lerLimites({ BROTO: -1, CAPIM: '2000' })).toEqual(LIMITES_PADRAO)
    expect(lerLimites(null)).toEqual(LIMITES_PADRAO)
  })
})
