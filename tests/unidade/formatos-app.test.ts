import { describe, expect, it } from 'vitest'
import {
  dataCurta,
  descontoDoCupom,
  nomeDoPiso,
  paraNivel,
  prazoDaReserva,
  primeiroNome,
  saudacao,
} from '../../src/app/formatos'

describe('formatos do app', () => {
  it('saudação pela hora de Palmas (UTC-3), não pela do aparelho', () => {
    expect(saudacao(new Date('2026-11-13T11:00:00Z'))).toBe('Bom dia') // 8 h em Palmas
    expect(saudacao(new Date('2026-11-13T17:00:00Z'))).toBe('Boa tarde') // 14 h
    expect(saudacao(new Date('2026-11-13T23:30:00Z'))).toBe('Boa noite') // 20 h 30
    expect(saudacao(new Date('2026-11-14T02:00:00Z'))).toBe('Boa noite') // 23 h
  })

  it('primeiro nome, piso, data curta e nível', () => {
    expect(primeiroNome(' Ana  Souza ')).toBe('Ana')
    expect(nomeDoPiso(1)).toBe('Térreo')
    expect(nomeDoPiso(2)).toBe('2º piso')
    expect(dataCurta('2026-12-31')).toBe('31/12')
    expect(paraNivel('CAPIM')).toBe('capim')
  })

  it('canhoto do cupom', () => {
    expect(descontoDoCupom({ tipo: 'PERCENTUAL', valor: 10 })).toBe('10%')
    expect(descontoDoCupom({ tipo: 'VALOR', valor: 2000 })).toBe('R$ 20')
    expect(descontoDoCupom({ tipo: 'VALOR', valor: 1550 })).toBe('R$ 15,50')
    expect(descontoDoCupom({ tipo: 'BRINDE', valor: 0 })).toBe('Grátis')
  })

  it('prazo da reserva', () => {
    const agora = Date.parse('2026-11-13T12:00:00Z')
    expect(prazoDaReserva('2026-11-13T16:00:00Z', agora)).toBe('Expira em 4 h')
    expect(prazoDaReserva('2026-11-13T12:35:00Z', agora)).toBe('Expira em 35 min')
    expect(prazoDaReserva('2026-11-13T11:00:00Z', agora)).toBe('Prazo vencido')
  })
})
