import { describe, expect, it } from 'vitest'
import {
  dataCurta,
  descontoDoCupom,
  nomeDoPiso,
  paraNivel,
  prazoDaReserva,
  primeiroNome,
  saudacao,
  escolhasDaReserva,
  haQuantoTempo,
  horaEmPalmas,
  numeroDoSelo,
  paraQueValeOCupom,
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

describe('formatos da reserva, dos cupons e dos avisos', () => {
  it('a hora em Palmas, as escolhas da reserva e para que o cupom vale', () => {
    expect(horaEmPalmas('2026-11-13T18:30:00Z')).toBe('15:30')
    expect(escolhasDaReserva({ tamanho: '42', cor: 'preto' })).toBe('Tamanho 42 · preto')
    expect(escolhasDaReserva({ tamanho: null, cor: null })).toBe('')
    expect(paraQueValeOCupom({ categoria: 'Calçados', loja: 'Centauro' })).toBe('Calçados na Centauro')
    expect(paraQueValeOCupom({ categoria: null, loja: 'Centauro' })).toBe('Tudo na Centauro')
    expect(paraQueValeOCupom({ categoria: null, loja: null })).toBe('Em qualquer loja')
  })

  it('há quanto tempo veio o aviso, e o número do selo', () => {
    const agora = Date.parse('2026-11-13T18:00:00Z')
    expect(haQuantoTempo('2026-11-13T17:59:40Z', agora)).toBe('agora')
    expect(haQuantoTempo('2026-11-13T17:55:00Z', agora)).toBe('há 5 min')
    expect(haQuantoTempo('2026-11-13T15:00:00Z', agora)).toBe('há 3 h')
    expect(haQuantoTempo('2026-11-12T12:00:00Z', agora)).toBe('ontem')
    expect(haQuantoTempo('2026-11-10T12:00:00Z', agora)).toBe('10/11')
    expect(numeroDoSelo(3)).toBe('3')
    expect(numeroDoSelo(12)).toBe('9+')
  })
})
