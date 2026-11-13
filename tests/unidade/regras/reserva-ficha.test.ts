import { describe, expect, it } from 'vitest'
import { filtrarFicha, idDoInteresse, juntarInteresses, removerInteresse } from '../../../functions/_lib/regras/ficha'
import {
  calcularExpiracao,
  mudarStatus,
  PRAZOS_PADRAO,
  statusEfetivo,
  TRANSICOES,
  type StatusReserva,
} from '../../../functions/_lib/regras/reserva'

describe('prazos da reserva (RN01, RN02)', () => {
  it('TU15: pagar na loja, criada às 10h, expira às 14h', () => {
    const criadaEm = new Date('2026-11-13T13:00:00Z') // 10h em Palmas
    expect(calcularExpiracao({ forma: 'NA_LOJA', criadaEm }).toISOString()).toBe('2026-11-13T17:00:00.000Z')
  })

  it('TU16: Pix pago expira 48 h depois do pagamento', () => {
    const criadaEm = new Date('2026-11-13T13:00:00Z')
    const pagaEm = new Date('2026-11-13T13:05:00Z')
    expect(calcularExpiracao({ forma: 'PIX', criadaEm, pagaEm }).toISOString()).toBe('2026-11-15T13:05:00.000Z')
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
    ['SEPARADA', 'PENDENTE'],
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
