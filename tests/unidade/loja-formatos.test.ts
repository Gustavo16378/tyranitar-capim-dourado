import { describe, expect, it } from 'vitest'
import { lerValorEmCentavos, paraNivel, valorParaCampo } from '../../src/loja/comum/formatos'
import { podeMudar, podeRetirar } from '../../src/loja/comum/reserva'

describe('lerValorEmCentavos', () => {
  it('lê o que o caixa digita, com vírgula ou ponto', () => {
    expect(lerValorEmCentavos('459,80')).toBe(45980)
    expect(lerValorEmCentavos('459.80')).toBe(45980)
    expect(lerValorEmCentavos('R$ 1.234,56')).toBe(123456)
    expect(lerValorEmCentavos('1.234')).toBe(123400)
    expect(lerValorEmCentavos('1234')).toBe(123400)
    expect(lerValorEmCentavos('0,29')).toBe(29)
    expect(lerValorEmCentavos(' 20,5 ')).toBe(2050)
  })

  it('recusa o que não é valor em reais', () => {
    expect(lerValorEmCentavos('')).toBeNull()
    expect(lerValorEmCentavos('abc')).toBeNull()
    expect(lerValorEmCentavos('12,345')).toBeNull()
    expect(lerValorEmCentavos('-10')).toBeNull()
    expect(lerValorEmCentavos('1,2,3')).toBeNull()
  })

  it('volta para o campo no mesmo formato', () => {
    expect(valorParaCampo(45980)).toBe('459,80')
    expect(valorParaCampo(123456)).toBe('1.234,56')
    expect(lerValorEmCentavos(valorParaCampo(123456))).toBe(123456)
  })
})

describe('paraNivel', () => {
  it('converte o nível da API para o dos componentes', () => {
    expect(paraNivel('CAPIM')).toBe('capim')
    expect(paraNivel('DOURADO')).toBe('dourado')
  })
})

describe('transições da reserva (docs/uml.md)', () => {
  it('segue o diagrama de estados', () => {
    expect(podeMudar('PENDENTE', 'CONFIRMADA')).toBe(true)
    expect(podeMudar('PENDENTE', 'SEPARADA')).toBe(true)
    expect(podeMudar('CONFIRMADA', 'RETIRADA')).toBe(true)
    expect(podeMudar('SEPARADA', 'CANCELADA')).toBe(true)
    expect(podeMudar('PENDENTE', 'RETIRADA')).toBe(false)
    expect(podeMudar('RETIRADA', 'CANCELADA')).toBe(false)
    expect(podeMudar('SEPARADA', 'PENDENTE')).toBe(false)
    expect(podeMudar('SEPARADA', 'EXPIRADA')).toBe(false)
  })

  it('só deixa retirar reserva confirmada ou separada', () => {
    expect(podeRetirar('SEPARADA')).toBe(true)
    expect(podeRetirar('CONFIRMADA')).toBe(true)
    expect(podeRetirar('PENDENTE')).toBe(false)
    expect(podeRetirar('EXPIRADA')).toBe(false)
  })
})
