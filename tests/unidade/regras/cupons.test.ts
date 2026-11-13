import { describe, expect, it } from 'vitest'
import { aplicarCupons, type ContextoCompra, type Cupom } from '../../../functions/_lib/regras/cupons'

const LOJA_A = 'loja-a'
const cupom = (parcial: Partial<Cupom> & Pick<Cupom, 'id'>): Cupom => ({
  titulo: parcial.id,
  lojaId: LOJA_A,
  tipo: 'PERCENTUAL',
  valor: 10,
  nivelMinimo: 'SEMENTE',
  limitePorCliente: 1,
  validade: '2026-12-31',
  ativo: true,
  ...parcial,
})

const DEZ_POR_CENTO = cupom({ id: 'cp1' })
const VINTE_REAIS_SHOPPING = cupom({ id: 'cp2', lojaId: null, tipo: 'VALOR', valor: 2000 })
const ctx: ContextoCompra = {
  lojaId: LOJA_A,
  nivelCliente: 'CAPIM',
  usosDoCliente: {},
  agora: new Date('2026-11-13T15:00:00Z'),
}

describe('cupons (RN05, RN06)', () => {
  it('TU06: 10% numa compra de R$ 459,80 é R$ 45,98', () => {
    const r = aplicarCupons(45980, [DEZ_POR_CENTO], ctx)
    expect(r.descontos).toEqual([{ cupomId: 'cp1', centavos: 4598 }])
    expect(r.valorPagoCentavos).toBe(41382)
  })

  it('TU07: cupom de R$ 20 numa compra de R$ 15 desconta R$ 15 e o valor pago não fica negativo', () => {
    const r = aplicarCupons(1500, [VINTE_REAIS_SHOPPING], ctx)
    expect(r.descontos).toEqual([{ cupomId: 'cp2', centavos: 1500 }])
    expect(r.valorPagoCentavos).toBe(0)
  })

  it('TU08: cupom da loja junto com voucher do shopping é permitido', () => {
    expect(() => aplicarCupons(45980, [DEZ_POR_CENTO, VINTE_REAIS_SHOPPING], ctx)).not.toThrow()
  })

  it('TU09: dois cupons da mesma loja na mesma compra é CUPONS_INCOMPATIVEIS', () => {
    expect(() => aplicarCupons(45980, [DEZ_POR_CENTO, cupom({ id: 'cp3', tipo: 'VALOR', valor: 500 })], ctx)).toThrow(
      expect.objectContaining({ codigo: 'CUPONS_INCOMPATIVEIS' }),
    )
  })

  it('dois vouchers do shopping ou o mesmo cupom repetido também são incompatíveis', () => {
    const outroVoucher = cupom({ id: 'cp4', lojaId: null, tipo: 'VALOR', valor: 1000 })
    expect(() => aplicarCupons(45980, [VINTE_REAIS_SHOPPING, outroVoucher], ctx)).toThrow(
      expect.objectContaining({ codigo: 'CUPONS_INCOMPATIVEIS' }),
    )
    expect(() => aplicarCupons(45980, [DEZ_POR_CENTO, DEZ_POR_CENTO], ctx)).toThrow(
      expect.objectContaining({ codigo: 'CUPONS_INCOMPATIVEIS' }),
    )
  })

  it('TU10: cupom de outra loja é CUPOM_INVALIDO', () => {
    expect(() => aplicarCupons(45980, [cupom({ id: 'cp5', lojaId: 'loja-b' })], ctx)).toThrow(
      expect.objectContaining({ codigo: 'CUPOM_INVALIDO' }),
    )
  })

  it('TU11: cupom vencido é CUPOM_INVALIDO, contando o dia pelo horário de Palmas', () => {
    const vencido = cupom({ id: 'cp6', validade: '2026-11-12' })
    expect(() => aplicarCupons(45980, [vencido], ctx)).toThrow(expect.objectContaining({ codigo: 'CUPOM_INVALIDO' }))
    // 01/01 às 02h em UTC ainda é 31/12 às 23h em Palmas: o cupom até 31/12 vale.
    const ultimoDia = { ...ctx, agora: new Date('2027-01-01T02:00:00Z') }
    expect(() => aplicarCupons(45980, [DEZ_POR_CENTO], ultimoDia)).not.toThrow()
    const diaSeguinte = { ...ctx, agora: new Date('2027-01-01T03:00:00Z') }
    expect(() => aplicarCupons(45980, [DEZ_POR_CENTO], diaSeguinte)).toThrow(
      expect.objectContaining({ codigo: 'CUPOM_INVALIDO' }),
    )
  })

  it('TU12: cupom acima do limite de usos do cliente é CUPOM_INVALIDO', () => {
    expect(() => aplicarCupons(45980, [DEZ_POR_CENTO], { ...ctx, usosDoCliente: { cp1: 1 } })).toThrow(
      expect.objectContaining({ codigo: 'CUPOM_INVALIDO' }),
    )
  })

  it('TU13: cupom com nível mínimo acima do nível do cliente é CUPOM_INVALIDO', () => {
    const dourado = cupom({ id: 'cp7', nivelMinimo: 'DOURADO' })
    expect(() => aplicarCupons(45980, [dourado], ctx)).toThrow(expect.objectContaining({ codigo: 'CUPOM_INVALIDO' }))
  })

  it('cupom inativo é CUPOM_INVALIDO', () => {
    expect(() => aplicarCupons(45980, [cupom({ id: 'cp8', ativo: false })], ctx)).toThrow(
      expect.objectContaining({ codigo: 'CUPOM_INVALIDO' }),
    )
  })

  it('TU14: o cupom da loja calcula sobre o bruto e o voucher do shopping é descontado depois', () => {
    // Na ordem inversa da lista, para provar que a ordem vem da regra.
    const r = aplicarCupons(45980, [VINTE_REAIS_SHOPPING, DEZ_POR_CENTO], ctx)
    expect(r).toEqual({
      valorBrutoCentavos: 45980,
      descontos: [
        { cupomId: 'cp1', centavos: 4598 },
        { cupomId: 'cp2', centavos: 2000 },
      ],
      valorPagoCentavos: 39382,
      reembolsos: [{ cupomId: 'cp2', centavos: 2000 }],
    })
    // Voucher percentual calcula sobre o que sobrou depois do cupom da loja.
    const voucher10 = cupom({ id: 'cp9', lojaId: null, valor: 10 })
    const r2 = aplicarCupons(10000, [DEZ_POR_CENTO, voucher10], ctx)
    expect(r2.descontos).toEqual([
      { cupomId: 'cp1', centavos: 1000 },
      { cupomId: 'cp9', centavos: 900 },
    ])
  })

  it('brinde do shopping não desconta nem gera reembolso', () => {
    const brinde = cupom({ id: 'cp10', lojaId: null, tipo: 'BRINDE', valor: 0 })
    const r = aplicarCupons(45980, [brinde], ctx)
    expect(r.valorPagoCentavos).toBe(45980)
    expect(r.reembolsos).toEqual([])
  })

  it('recusa valor de compra zero ou negativo', () => {
    expect(() => aplicarCupons(0, [], ctx)).toThrow(expect.objectContaining({ codigo: 'DADOS_INVALIDOS' }))
  })
})
