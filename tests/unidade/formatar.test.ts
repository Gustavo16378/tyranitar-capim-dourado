import { describe, expect, it } from 'vitest'
import { formatarNumero, formatarPreco } from '../../src/componentes/formatar'

describe('formatarPreco', () => {
  it('escreve reais com vírgula e milhar com ponto', () => {
    expect(formatarPreco(39990)).toBe('R$ 399,90')
    expect(formatarPreco(45980)).toBe('R$ 459,80')
    expect(formatarPreco(123456)).toBe('R$ 1.234,56')
    expect(formatarPreco(0)).toBe('R$ 0,00')
  })
})

describe('formatarNumero', () => {
  it('separa o milhar com ponto', () => {
    expect(formatarNumero(2140)).toBe('2.140')
    expect(formatarNumero(500)).toBe('500')
    expect(formatarNumero(1234567)).toBe('1.234.567')
  })
})
