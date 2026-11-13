import { beforeEach, describe, expect, it } from 'vitest'
import { criarTokenFalso } from '../../src/mocks/comum/token'
import { reiniciarMocks, responderMock } from '../../src/mocks/loja'
import { hojeEmPalmas } from '../../src/painel/comum/formatos'
import { situacaoDoCupom, textoDoDesconto } from '../../src/painel/cupons/textos'
import type { CupomDaLoja, Lista, PedidoCupom, Relatorio } from '../../src/tipos/loja'

let token: string | null = null

async function chamar<T = unknown>(metodo: string, url: string, corpo?: unknown) {
  const resposta = await responderMock({ metodo, url, corpo: corpo === undefined ? undefined : JSON.stringify(corpo), token })
  if (!resposta) throw new Error(`${metodo} ${url} não está mockada`)
  return { status: resposta.status, corpo: (await resposta.json()) as T }
}

beforeEach(async () => {
  reiniciarMocks()
  token = null
  // O token do login real (o mock só lê o perfil e o exp).
  token = criarTokenFalso({ sub: 'l-pc01a', perfil: 'LOJISTA', lojaId: 'loja-pc01a' })
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
    const { corpo } = await chamar<Lista<CupomDaLoja>>('GET', '/api/loja/cupons')
    expect(corpo.itens.map((c) => c.id)).toEqual(['cp1', 'cp3', 'cp5', 'cp4'])
    expect(corpo.itens[0]).toMatchObject({ titulo: '10% em calçados', usos: 12 })
    expect(corpo.itens[0].descontoCentavos).toBe(Array.from({ length: 12 }, (_, i) => 2990 + i * 410).reduce((a, b) => a + b))
    expect(corpo.itens.find((c) => c.id === 'cp2')).toBeUndefined()
  })

  it('cria o cupom, que entra na lista da loja', async () => {
    const criado = await chamar<CupomDaLoja>('POST', '/api/loja/cupons', NOVO)
    expect(criado.status).toBe(201)
    expect(criado.corpo).toMatchObject({ ...NOVO, ativo: true, usos: 0, descontoCentavos: 0 })
    const lista = await chamar<Lista<CupomDaLoja>>('GET', '/api/loja/cupons')
    expect(lista.corpo.itens.map((c) => c.titulo)).toContain('R$ 30 em tênis')
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

describe('mocks: GET /api/loja/relatorios', () => {
  it('traz os campos do contrato e muda com o período', async () => {
    const trinta = await chamar<Relatorio>('GET', '/api/loja/relatorios?periodo=30d')
    expect(trinta.status).toBe(200)
    expect(Object.keys(trinta.corpo).sort()).toEqual(
      ['comparativoCategoria', 'cupons', 'maisBuscados', 'maisVendidos', 'naoEncontrados', 'parados', 'periodo', 'picos', 'reservas', 'ticketMedio'],
    )
    expect(trinta.corpo.naoEncontrados[0]).toEqual({ termo: 'tênis de trilha', buscas: 120 })
    const { feitas, retiradas, emAberto, canceladas, expiradas } = trinta.corpo.reservas
    expect(feitas).toBe(retiradas + emAberto + canceladas + expiradas)
    expect(emAberto).toBe(7)

    const sete = await chamar<Relatorio>('GET', '/api/loja/relatorios?periodo=7d')
    expect(sete.corpo.maisVendidos[0].quantidade).toBeLessThan(trinta.corpo.maisVendidos[0].quantidade)
  })

  it('recusa período fora da lista', async () => {
    const { status } = await chamar('GET', '/api/loja/relatorios?periodo=1a')
    expect(status).toBe(400)
  })
})
