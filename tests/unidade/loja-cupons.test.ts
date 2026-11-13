import { beforeEach, describe, expect, it } from 'vitest'
import { reiniciarMocks, responderMock } from '../../src/mocks/loja'
import { hojeEmPalmas } from '../../src/loja/comum/formatos'
import { QR_DA_ANA } from '../../src/loja/telas/atendimento/demo'
import { situacaoDoCupom, textoDoDesconto } from '../../src/loja/telas/cupons/textos'
import type { Atendimento, CupomDaLoja, Pagina, PedidoCupom, RespostaLogin } from '../../src/tipos/loja'

let token: string | null = null

async function chamar<T = unknown>(metodo: string, url: string, corpo?: unknown) {
  const resposta = await responderMock({ metodo, url, corpo: corpo === undefined ? undefined : JSON.stringify(corpo), token })
  if (!resposta) throw new Error(`${metodo} ${url} não está mockada`)
  return { status: resposta.status, corpo: (await resposta.json()) as T }
}

beforeEach(async () => {
  reiniciarMocks()
  token = null
  const { corpo } = await chamar<RespostaLogin>('POST', '/api/auth/login', {
    email: 'lojista.loja-19@demo.test',
    senha: '12345678',
  })
  token = corpo.token
})

const daqui = (dias: number) => hojeEmPalmas(Date.now() + dias * 86_400_000)

const NOVO: PedidoCupom = {
  titulo: 'R$ 30 em tênis',
  tipo: 'VALOR',
  valor: 3000,
  categoriaAlvo: 'calcados',
  nivelMinimo: 'BROTO',
  limitePorCliente: 1,
  validade: daqui(10),
}

describe('mocks: cupons da loja', () => {
  it('lista só os cupons da loja, com uso e desconto, os que valem primeiro', async () => {
    const { corpo } = await chamar<Pagina<CupomDaLoja>>('GET', '/api/loja/cupons')
    expect(corpo.itens.map((c) => c.id)).toEqual(['cp1', 'cp3', 'cp5', 'cp4'])
    expect(corpo.itens[0]).toMatchObject({ titulo: '10% em calçados', usos: 12 })
    expect(corpo.itens[0].descontoCentavos).toBe(Array.from({ length: 12 }, (_, i) => 2990 + i * 410).reduce((a, b) => a + b))
    expect(corpo.itens.find((c) => c.id === 'cp2')).toBeUndefined()
  })

  it('cria o cupom, que já vale no atendimento de quem tem o nível', async () => {
    const criado = await chamar<CupomDaLoja>('POST', '/api/loja/cupons', NOVO)
    expect(criado.status).toBe(201)
    expect(criado.corpo).toMatchObject({ ...NOVO, ativo: true, usos: 0, descontoCentavos: 0 })
    const atendimento = await chamar<Atendimento>('GET', `/api/loja/atendimento/${QR_DA_ANA}`)
    expect(atendimento.corpo.cupons.map((c) => c.titulo)).toContain('R$ 30 em tênis')
  })

  it('recusa cupom fora das regras com 400', async () => {
    const casos: Partial<PedidoCupom>[] = [
      { tipo: 'PERCENTUAL', valor: 120 },
      { tipo: 'BRINDE', valor: 500 },
      { validade: daqui(-1) },
      { limitePorCliente: 0 },
      { titulo: 'oi' },
      { categoriaAlvo: 'pet' },
    ]
    for (const caso of casos) {
      const { status, corpo } = await chamar('POST', '/api/loja/cupons', { ...NOVO, ...caso })
      expect(status, JSON.stringify(caso)).toBe(400)
      expect(corpo).toMatchObject({ erro: 'DADOS_INVALIDOS' })
    }
  })
})

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
