// Minhas compras: o dia da compra no fuso de Palmas e os pontos ganhos (src/app/formatos.ts).
import { describe, expect, it } from 'vitest'
import { dataDaCompra, pontosGanhos } from '../../src/app/formatos'

describe('dataDaCompra', () => {
  it('o dia em Palmas (UTC-3), não o de Greenwich', () => {
    expect(dataDaCompra('2026-11-12T18:30:00.000Z')).toBe('12 de nov. de 2026')
    // 1h da manhã em UTC ainda é o dia anterior em Palmas.
    expect(dataDaCompra('2026-11-13T01:00:00.000Z')).toBe('12 de nov. de 2026')
  })
})

describe('pontosGanhos', () => {
  it('com sinal, milhar e singular; sem pontos quando o cupom cobriu tudo', () => {
    expect(pontosGanhos(339)).toBe('+339 pontos')
    expect(pontosGanhos(1400)).toBe('+1.400 pontos')
    expect(pontosGanhos(1)).toBe('+1 ponto')
    expect(pontosGanhos(0)).toBe('Sem pontos')
  })
})
