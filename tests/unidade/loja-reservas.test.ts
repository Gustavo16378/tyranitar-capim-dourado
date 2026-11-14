// A hora em que a reserva fica pronta, no painel da loja (src/loja/comum/horario.ts, TU44): a
// próxima meia hora já vem no campo, e a frase embaixo dele diz hoje, amanhã ou agora, igual ao que
// a API grava (functions/_lib/regras/reserva.ts › prontaAPartirDe).
import { describe, expect, it } from 'vitest'
import { prontaAPartirDe } from '../../functions/_lib/regras/reserva'
import { fraseDaHoraPronta, horaEmPalmas, proximaMeiaHora, quandoFicaPronta } from '../../src/loja/comum/horario'
import { detalheDaReserva } from '../../src/loja/comum/reserva'

/** Um instante pela hora de Palmas (UTC-3) de 13/11/2026. */
const emPalmas = (hora: string, dia = '2026-11-13') => Date.parse(`${dia}T${hora}:00-03:00`)

describe('TU44: a hora "pronta para retirar a partir de"', () => {
  it('a próxima meia hora cheia, em Palmas', () => {
    expect(proximaMeiaHora(emPalmas('14:10'))).toBe('14:30')
    expect(proximaMeiaHora(emPalmas('14:29') + 59_000)).toBe('14:30')
    expect(proximaMeiaHora(emPalmas('14:30'))).toBe('15:00')
    expect(proximaMeiaHora(emPalmas('14:45'))).toBe('15:00')
    expect(proximaMeiaHora(emPalmas('23:50'))).toBe('00:00')
    expect(horaEmPalmas('2026-11-13T18:30:00Z')).toBe('15:30')
  })

  it('hoje, amanhã ou agora, como a API calcula', () => {
    const agora = emPalmas('14:00')
    expect(fraseDaHoraPronta('15:30', agora)).toBe('Hoje, a partir das 15:30.')
    expect(fraseDaHoraPronta('13:30', agora)).toBe('Essa hora já passou: a reserva fica pronta agora.')
    expect(fraseDaHoraPronta('09:00', agora)).toBe('Amanhã, a partir das 09:00.')
    for (const errada of ['15h30', '25:00', '9:00', '15:60', '']) expect(fraseDaHoraPronta(errada, agora)).toBeNull()
  })

  it('dá o mesmo instante que a API grava, a qualquer hora do dia', () => {
    for (const agoraEm of ['00:05', '08:59', '13:00', '14:00', '22:40', '23:59']) {
      const agora = emPalmas(agoraEm)
      for (let minutos = 0; minutos < 24 * 60; minutos += 25) {
        const hora = `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
        expect(quandoFicaPronta(hora, agora)?.instante, `${hora} às ${agoraEm}`).toBe(prontaAPartirDe(hora, new Date(agora)).getTime())
      }
    }
  })

  it('o que identifica a reserva no balcão: tamanho, cor e quantidade', () => {
    expect(detalheDaReserva({ tamanho: '42', cor: 'preto', quantidade: 1 })).toBe('tamanho 42 · preto')
    expect(detalheDaReserva({ tamanho: 'M', cor: null, quantidade: 2 })).toBe('tamanho M · 2 unidades')
    expect(detalheDaReserva({ tamanho: null, cor: null, quantidade: 1 })).toBe('')
  })
})
