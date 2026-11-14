import { describe, expect, it } from 'vitest'
import { filtrarFicha, idDoInteresse, juntarInteresses, removerInteresse } from '../../../functions/_lib/regras/ficha'
import {
  calcularExpiracao,
  mudarStatus,
  PRAZOS_PADRAO,
  prontaAPartirDe,
  statusEfetivo,
  TRANSICOES,
  type StatusReserva,
} from '../../../functions/_lib/regras/reserva'

describe('prazos da reserva (RN01, RN02)', () => {
  it('TU15: pendente, criada às 10h, a loja tem até as 14h para confirmar', () => {
    const criadaEm = new Date('2026-11-13T13:00:00Z') // 10h em Palmas
    expect(calcularExpiracao({ forma: 'NA_LOJA', criadaEm }).toISOString()).toBe('2026-11-13T17:00:00.000Z')
  })

  it('TU16: o prazo para retirar conta da hora que a loja confirmou: 4 h na loja, 48 h com o Pix pago', () => {
    const criadaEm = new Date('2026-11-13T13:00:00Z')
    const prontaEm = new Date('2026-11-13T18:30:00Z') // pronta às 15h30 em Palmas
    expect(calcularExpiracao({ forma: 'NA_LOJA', criadaEm, prontaEm }).toISOString()).toBe('2026-11-13T22:30:00.000Z')
    expect(calcularExpiracao({ forma: 'PIX', criadaEm, prontaEm, pago: true }).toISOString()).toBe('2026-11-15T18:30:00.000Z')
    // Pix ainda não pago tem o prazo de pagar na loja, também depois de confirmada.
    expect(calcularExpiracao({ forma: 'PIX', criadaEm, prontaEm, pago: false }).toISOString()).toBe('2026-11-13T22:30:00.000Z')
  })

  it('TU42: a hora "pronta a partir de" é a de Palmas, hoje, ou amanhã se já passou', () => {
    const agora = new Date('2026-11-13T17:00:00Z') // 14h em Palmas
    expect(prontaAPartirDe('15:30', agora).toISOString()).toBe('2026-11-13T18:30:00.000Z')
    // Hora que acabou de passar (menos de 1 h): pronta agora.
    expect(prontaAPartirDe('13:30', agora).toISOString()).toBe(agora.toISOString())
    // De noite para a manhã: amanhã.
    expect(prontaAPartirDe('09:00', agora).toISOString()).toBe('2026-11-14T12:00:00.000Z')
    // Sem hora: pronta agora.
    expect(prontaAPartirDe(undefined, agora)).toEqual(agora)
    for (const errada of ['15h30', '25:00', '9:00', '15:60']) {
      expect(() => prontaAPartirDe(errada, agora)).toThrow(expect.objectContaining({ codigo: 'DADOS_INVALIDOS' }))
    }
  })

  it('Pix ainda não pago tem o prazo de pagar na loja; os prazos vêm da configuração', () => {
    const criadaEm = new Date('2026-11-13T13:00:00Z')
    expect(calcularExpiracao({ forma: 'PIX', criadaEm }).toISOString()).toBe('2026-11-13T17:00:00.000Z')
    expect(calcularExpiracao({ forma: 'NA_LOJA', criadaEm }, { ...PRAZOS_PADRAO, NA_LOJA: 2 }).toISOString()).toBe(
      '2026-11-13T15:00:00.000Z',
    )
  })

  it('TU17: reserva ativa lida depois do prazo é EXPIRADA', () => {
    const reserva = { status: 'SEPARADA' as const, expiraEm: '2026-11-13T17:00:00Z' }
    expect(statusEfetivo(reserva, new Date('2026-11-13T16:59:59Z'))).toBe('SEPARADA')
    expect(statusEfetivo(reserva, new Date('2026-11-13T17:00:01Z'))).toBe('EXPIRADA')
    expect(statusEfetivo({ ...reserva, status: 'RETIRADA' }, new Date('2026-11-20T00:00:00Z'))).toBe('RETIRADA')
  })
})

describe('estados da reserva (RF20)', () => {
  const permitidas = Object.entries(TRANSICOES).flatMap(([de, paras]) =>
    paras.map((para) => [de as StatusReserva, para] as const),
  )

  it.each(permitidas)('TU18: %s → %s é aceita', (de, para) => {
    expect(mudarStatus(de, para)).toBe(para)
  })

  it.each([
    ['RETIRADA', 'CANCELADA'],
    ['EXPIRADA', 'SEPARADA'],
    ['CANCELADA', 'PENDENTE'],
    ['PENDENTE', 'RETIRADA'],
    // A loja confirma antes de separar.
    ['PENDENTE', 'SEPARADA'],
    ['SEPARADA', 'PENDENTE'],
    ['RECUSADA', 'CONFIRMADA'],
    ['RETIRADA', 'RECUSADA'],
  ] as const)('TU19: %s → %s é TRANSICAO_INVALIDA', (de, para) => {
    expect(() => mudarStatus(de, para)).toThrow(expect.objectContaining({ codigo: 'TRANSICAO_INVALIDA' }))
  })
})

describe('ficha do cliente (RN04)', () => {
  const interesses = [
    { categoria: 'calcados', detalhe: 'Tênis de corrida, número 42, até R$ 400' },
    { categoria: 'roupas', detalhe: 'Jaqueta corta-vento verde' },
    { categoria: 'Calcados', detalhe: 'Prefere preto' },
  ]

  it('TU20: numa loja de calçados mantém os calçados e tira as jaquetas', () => {
    expect(filtrarFicha(interesses, ['calcados'], true)).toEqual([
      'Tênis de corrida, número 42, até R$ 400',
      'Prefere preto',
    ])
  })

  it('TU21: sem consentimento a ficha vem vazia', () => {
    expect(filtrarFicha(interesses, ['calcados', 'roupas'], false)).toEqual([])
  })
})

describe('interesses que o cliente apaga na Minha conta', () => {
  const tenis = { categoria: 'calcados', detalhe: 'Tênis de corrida, número 42' }
  const jaqueta = { categoria: 'roupas', detalhe: 'Jaqueta corta-vento verde' }

  it('o id sai da frase: o mesmo para a mesma frase, outro para outra frase', () => {
    expect(idDoInteresse(tenis)).toMatch(/^[0-9a-z]+$/)
    expect(idDoInteresse(tenis)).toBe(idDoInteresse({ detalhe: 'Tênis de corrida, número 42' }))
    // Acento, caixa e espaço a mais não mudam o interesse (como no juntarInteresses).
    expect(idDoInteresse({ detalhe: '  TENIS de  corrida, numero 42 ' })).toBe(idDoInteresse(tenis))
    expect(idDoInteresse(jaqueta)).not.toBe(idDoInteresse(tenis))
  })

  it('o id não muda quando a Capi anota outros interesses', () => {
    const antes = idDoInteresse(tenis)
    const ficha = juntarInteresses([tenis], [jaqueta, { categoria: 'calcados', detalhe: 'Prefere preto' }])
    expect(ficha.map(idDoInteresse)).toContain(antes)
  })

  it('removerInteresse tira só o do id e diz se ele estava lá', () => {
    expect(removerInteresse([tenis, jaqueta], idDoInteresse(tenis))).toEqual({ restantes: [jaqueta], removido: true })
    expect(removerInteresse([tenis, jaqueta], 'outro')).toEqual({ restantes: [tenis, jaqueta], removido: false })
    expect(removerInteresse([], idDoInteresse(tenis))).toEqual({ restantes: [], removido: false })
  })
})
