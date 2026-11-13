import { describe, expect, it } from 'vitest'
import {
  formatarDataHora,
  formatarDia,
  lerValorEmCentavos,
  paraNivel,
  prazoRestante,
  valorParaCampo,
} from '../../src/painel/comum/formatos'
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

describe('datas em Palmas (UTC-3)', () => {
  it('escreve data e hora curtas no fuso de Palmas', () => {
    expect(formatarDataHora('2026-11-14T18:00:00Z')).toBe('14/11, 15:00')
    expect(formatarDataHora('2026-11-14T01:30:00Z')).toBe('13/11, 22:30')
    expect(formatarDia('2026-12-31')).toBe('31/12')
  })

  it('diz quanto falta para o prazo', () => {
    const agora = Date.parse('2026-11-13T12:00:00Z')
    expect(prazoRestante('2026-11-13T12:40:00Z', agora)).toBe('Expira em 40 min')
    expect(prazoRestante('2026-11-13T15:10:00Z', agora)).toBe('Expira em 3 h')
    expect(prazoRestante('2026-11-16T12:00:00Z', agora)).toBe('Expira em 3 dias')
    expect(prazoRestante('2026-11-13T11:59:00Z', agora)).toBe('Prazo vencido')
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
