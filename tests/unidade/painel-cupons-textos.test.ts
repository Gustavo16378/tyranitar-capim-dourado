// Os textos do cartão de cupom dos painéis. As rotas de cupons e do relatório da loja são
// testadas contra a API real em tests/api/cupons-e-relatorios-da-loja.test.ts.
import { describe, expect, it } from 'vitest'
import { situacaoDoCupom, textoDoDesconto } from '../../src/painel/cupons/textos'

describe('textos do cupom', () => {
  it('escreve o desconto do canhoto', () => {
    expect(textoDoDesconto({ tipo: 'PERCENTUAL', valor: 10 })).toBe('10%')
    expect(textoDoDesconto({ tipo: 'VALOR', valor: 1500 })).toBe('R$ 15')
    expect(textoDoDesconto({ tipo: 'VALOR', valor: 1250 })).toBe('R$ 12,50')
    expect(textoDoDesconto({ tipo: 'BRINDE', valor: 0 })).toBe('Brinde')
  })

  it('avisa inativo, vencido e vencendo, e cala quando vale normalmente', () => {
    const hoje = '2026-11-13'
    expect(situacaoDoCupom({ ativo: false, validade: '2026-12-31' }, hoje)?.texto).toBe('Inativo')
    expect(situacaoDoCupom({ ativo: true, validade: '2026-11-12' }, hoje)?.texto).toBe('Vencido')
    expect(situacaoDoCupom({ ativo: true, validade: '2026-11-13' }, hoje)?.texto).toBe('Vence hoje')
    expect(situacaoDoCupom({ ativo: true, validade: '2026-11-14' }, hoje)?.texto).toBe('Vence amanhã')
    expect(situacaoDoCupom({ ativo: true, validade: '2026-11-20' }, hoje)).toMatchObject({ tom: 'aviso', texto: 'Vence em 7 dias' })
    expect(situacaoDoCupom({ ativo: true, validade: '2026-11-21' }, hoje)).toBeNull()
  })
})
