// Cupons item por item (RN05, RN06 e RN15): o cupom da loja com categoria só desconta nos itens
// dessa categoria; sem categoria, na compra toda da loja; no máximo um da loja e um voucher do
// shopping por compra, contando os das reservas; o voucher desconta sobre o que sobrou.
import { describe, expect, it } from 'vitest'
import {
  aplicarCuponsNosItens,
  itemAceitaCupom,
  repartir,
  type ContextoCompra,
  type Cupom,
  type ItemDaCompra,
} from '../../../functions/_lib/regras/cupons'

const LOJA = 'loja-a'
const cupom = (parcial: Partial<Cupom> & Pick<Cupom, 'id'>): Cupom => ({
  titulo: parcial.id,
  lojaId: LOJA,
  tipo: 'PERCENTUAL',
  valor: 10,
  nivelMinimo: 'SEMENTE',
  limitePorCliente: 1,
  validade: '2026-12-31',
  ativo: true,
  categoria: null,
  ...parcial,
})
const DEZ_EM_CALCADOS = cupom({ id: 'cp-calcados', titulo: '10% em calçados', categoria: 'calcados' })
const QUINZE_EM_ROUPAS = cupom({ id: 'cp-roupas', titulo: 'R$ 15 em camisetas', tipo: 'VALOR', valor: 1500, categoria: 'roupas' })
const CINCO_NA_LOJA = cupom({ id: 'cp-loja', titulo: '5% na loja toda', valor: 5 })
const VINTE_DO_SHOPPING = cupom({ id: 'cp-shopping', titulo: 'R$ 20 em qualquer loja', lojaId: null, tipo: 'VALOR', valor: 2000 })
const ctx: ContextoCompra = { lojaId: LOJA, nivelCliente: 'CAPIM', usosDoCliente: {}, agora: new Date('2026-11-13T15:00:00Z') }

const TENIS: ItemDaCompra = { chave: 'tenis', categoria: 'calcados', quantidade: 1, precoCentavos: 39990 }
const CAMISETA: ItemDaCompra = { chave: 'camiseta', categoria: 'roupas', quantidade: 2, precoCentavos: 5990 }
const OUTROS: ItemDaCompra = { chave: 'outros', categoria: null, quantidade: 1, precoCentavos: 1000 }

describe('TU39: cupom de categoria só nos itens da categoria (RN15)', () => {
  it('"10% em calçados" numa compra só com camiseta é recusado', () => {
    expect(() => aplicarCuponsNosItens([CAMISETA], [DEZ_EM_CALCADOS], ctx)).toThrow(
      expect.objectContaining({
        codigo: 'CUPOM_INVALIDO',
        message: 'O cupom "10% em calçados" vale só para calçados, e a compra não tem itens dessa categoria.',
      }),
    )
  })

  it('com tênis e camiseta, desconta só no tênis; o valor avulso ("Outros") nunca entra', () => {
    const r = aplicarCuponsNosItens([TENIS, CAMISETA, OUTROS], [DEZ_EM_CALCADOS], ctx)
    expect(r.itens.map((i) => [i.chave, i.descontos])).toEqual([
      ['tenis', [{ cupomId: 'cp-calcados', centavos: 3999 }]],
      ['camiseta', []],
      ['outros', []],
    ])
    expect(r.valorBrutoCentavos).toBe(39990 + 11980 + 1000)
    expect(r.valorPagoCentavos).toBe(39990 + 11980 + 1000 - 3999)
    expect(() => aplicarCuponsNosItens([OUTROS], [DEZ_EM_CALCADOS], ctx)).toThrow(expect.objectContaining({ codigo: 'CUPOM_INVALIDO' }))
  })

  it('cupom da loja sem categoria vale na compra toda, também no "Outros"', () => {
    const r = aplicarCuponsNosItens([TENIS, OUTROS], [CINCO_NA_LOJA], ctx)
    expect(r.descontos).toEqual([{ cupomId: 'cp-loja', centavos: Math.floor((40990 * 5) / 100) }])
    expect(r.itens.every((i) => i.descontos.length === 1)).toBe(true)
  })

  it('a regra de quem aceita: categoria certa, sem categoria, voucher; o item pago com Pix fica fora', () => {
    expect(itemAceitaCupom(CAMISETA, DEZ_EM_CALCADOS)).toBe(false)
    expect(itemAceitaCupom(TENIS, DEZ_EM_CALCADOS)).toBe(true)
    expect(itemAceitaCupom(OUTROS, CINCO_NA_LOJA)).toBe(true)
    expect(itemAceitaCupom(OUTROS, VINTE_DO_SHOPPING)).toBe(true)
    expect(itemAceitaCupom({ ...TENIS, jaPago: true }, DEZ_EM_CALCADOS)).toBe(false)
  })
})

describe('TU40: o desconto item por item', () => {
  it('o da loja calcula sobre os itens dele; o voucher, sobre o que sobrou de todos', () => {
    const r = aplicarCuponsNosItens([TENIS, CAMISETA], [VINTE_DO_SHOPPING, QUINZE_EM_ROUPAS], ctx)
    // R$ 15 nas camisetas; os R$ 20 do voucher repartidos pelo que sobrou (399,90 e 104,80).
    expect(r.descontos).toEqual([
      { cupomId: 'cp-roupas', centavos: 1500 },
      { cupomId: 'cp-shopping', centavos: 2000 },
    ])
    const [tenis, camiseta] = r.itens
    expect(camiseta.descontos[0]).toEqual({ cupomId: 'cp-roupas', centavos: 1500 })
    expect(tenis.descontos[0].centavos + camiseta.descontos[1].centavos).toBe(2000)
    expect(tenis.pagoCentavos + camiseta.pagoCentavos).toBe(r.valorPagoCentavos)
    expect(r.reembolsos).toEqual([{ cupomId: 'cp-shopping', centavos: 2000 }])
  })

  it('no máximo um cupom da loja e um voucher do shopping por compra', () => {
    expect(() => aplicarCuponsNosItens([TENIS, CAMISETA], [DEZ_EM_CALCADOS, QUINZE_EM_ROUPAS], ctx)).toThrow(
      expect.objectContaining({ codigo: 'CUPONS_INCOMPATIVEIS' }),
    )
  })

  it('validade, nível mínimo e uso único continuam valendo', () => {
    expect(() => aplicarCuponsNosItens([TENIS], [{ ...DEZ_EM_CALCADOS, validade: '2026-11-12' }], ctx)).toThrow(
      expect.objectContaining({ codigo: 'CUPOM_INVALIDO' }),
    )
    expect(() => aplicarCuponsNosItens([TENIS], [{ ...DEZ_EM_CALCADOS, nivelMinimo: 'DOURADO' }], ctx)).toThrow(
      expect.objectContaining({ codigo: 'CUPOM_INVALIDO' }),
    )
    expect(() => aplicarCuponsNosItens([TENIS], [DEZ_EM_CALCADOS], { ...ctx, usosDoCliente: { 'cp-calcados': 1 } })).toThrow(
      expect.objectContaining({ codigo: 'CUPOM_INVALIDO' }),
    )
  })

  it('repartir soma sempre o total, sem centavo a mais nem a menos', () => {
    expect(repartir(100, [500, 500, 500])).toEqual([34, 33, 33])
    // Nenhum item recebe mais desconto que o valor dele.
    expect(repartir(3, [1, 1, 1])).toEqual([1, 1, 1])
    expect(repartir(0, [10, 20])).toEqual([0, 0])
    expect(repartir(7, [0, 10])).toEqual([0, 7])
  })
})

describe('TU41: a reserva no balcão', () => {
  it('o cupom da reserva vale como prometido, mesmo vencido, e conta no limite da compra', () => {
    const reservado: ItemDaCompra = { ...TENIS, chave: 'reserva', descontoDaReserva: { cupomId: 'cp-calcados', centavos: 3999 } }
    const vencido = { ...DEZ_EM_CALCADOS, validade: '2026-11-01' }
    const r = aplicarCuponsNosItens([reservado], [vencido], ctx)
    expect(r.valorPagoCentavos).toBe(39990 - 3999)
    expect(r.descontos).toEqual([{ cupomId: 'cp-calcados', centavos: 3999 }])
    // Outro cupom da loja no caixa passaria do limite de um por compra.
    expect(() => aplicarCuponsNosItens([reservado, CAMISETA], [vencido, QUINZE_EM_ROUPAS], ctx)).toThrow(
      expect.objectContaining({ codigo: 'CUPONS_INCOMPATIVEIS' }),
    )
  })

  it('o item pago com Pix entra no valor e nos pontos, mas o caixa não cobra e nenhum cupom do caixa desconta nele', () => {
    const pago: ItemDaCompra = { ...TENIS, chave: 'reserva-pix', jaPago: true }
    const r = aplicarCuponsNosItens([pago, CAMISETA], [VINTE_DO_SHOPPING], ctx)
    expect(r.itens[0]).toMatchObject({ jaPago: true, descontos: [], pagoCentavos: 39990 })
    expect(r.itens[1].descontos).toEqual([{ cupomId: 'cp-shopping', centavos: 2000 }])
    expect(r.valorPagoCentavos).toBe(39990 + 11980 - 2000)
    expect(r.aPagarNoCaixaCentavos).toBe(11980 - 2000)
  })
})
