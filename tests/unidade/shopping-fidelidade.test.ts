import { beforeEach, describe, expect, it } from 'vitest'
import { responderMock as responderDaLoja, reiniciarMocks as reiniciarLoja } from '../../src/mocks/loja'
import { reiniciarMocks, responderMock } from '../../src/mocks/shopping'
import { hojeEmPalmas } from '../../src/painel/comum/formatos'
import { QR_DA_ANA } from '../../src/loja/telas/atendimento/demo'
import type { Atendimento } from '../../src/tipos/loja'
import type { ConfiguracaoDoShopping, Pagina, PedidoCupom, RespostaLogin, VoucherDoShopping } from '../../src/tipos/shopping'

let token: string | null = null
let tokenDaLoja: string | null = null

async function chamar<T = unknown>(metodo: string, url: string, corpo?: unknown) {
  const resposta = await responderMock({ metodo, url, corpo: corpo === undefined ? undefined : JSON.stringify(corpo), token })
  if (!resposta) throw new Error(`${metodo} ${url} não está mockada`)
  return { status: resposta.status, corpo: (await resposta.json()) as T }
}

async function chamarNaLoja<T = unknown>(metodo: string, url: string, corpo?: unknown) {
  const resposta = await responderDaLoja({ metodo, url, corpo: corpo === undefined ? undefined : JSON.stringify(corpo), token: tokenDaLoja })
  if (!resposta) throw new Error(`${metodo} ${url} não está mockada na loja`)
  return { status: resposta.status, corpo: (await resposta.json()) as T }
}

beforeEach(async () => {
  reiniciarLoja()
  reiniciarMocks()
  token = null
  token = (await chamar<RespostaLogin>('POST', '/api/auth/login', { email: 'admin@demo.test', senha: '12345678' })).corpo.token
  tokenDaLoja = (await chamarNaLoja<RespostaLogin>('POST', '/api/auth/login', { email: 'lojista.loja-19@demo.test', senha: '12345678' })).corpo.token
})

const CONFIGURACAO: ConfiguracaoDoShopping = {
  niveis: { SEMENTE: 0, BROTO: 400, CAPIM: 1800, DOURADO: 4500 },
  pontosPorReal: 2,
  prazoReservaHoras: { NA_LOJA: 6, PIX: 72 },
}

describe('mocks do shopping: configuração da fidelidade', () => {
  it('lê e salva os níveis, os pontos por real e os prazos', async () => {
    const inicial = await chamar<ConfiguracaoDoShopping>('GET', '/api/shopping/configuracao')
    expect(inicial.corpo.niveis).toEqual({ SEMENTE: 0, BROTO: 500, CAPIM: 2000, DOURADO: 5000 })
    const salva = await chamar<ConfiguracaoDoShopping>('PUT', '/api/shopping/configuracao', CONFIGURACAO)
    expect(salva.corpo).toEqual(CONFIGURACAO)
    expect((await chamar('GET', '/api/shopping/configuracao')).corpo).toEqual(CONFIGURACAO)
  })

  it('recusa níveis fora de ordem, Semente acima de zero e prazos fora da faixa', async () => {
    const casos = [
      { ...CONFIGURACAO, niveis: { ...CONFIGURACAO.niveis, CAPIM: 300 } },
      { ...CONFIGURACAO, niveis: { ...CONFIGURACAO.niveis, SEMENTE: 10 } },
      { ...CONFIGURACAO, prazoReservaHoras: { NA_LOJA: 30, PIX: 48 } },
      { ...CONFIGURACAO, pontosPorReal: 0 },
    ]
    for (const caso of casos) {
      const { status } = await chamar('PUT', '/api/shopping/configuracao', caso)
      expect(status, JSON.stringify(caso)).toBe(400)
    }
  })
})

describe('mocks do shopping: vouchers', () => {
  it('lista os vouchers com o uso tirado dos reembolsos às lojas', async () => {
    const { corpo } = await chamar<Pagina<VoucherDoShopping>>('GET', '/api/shopping/cupons')
    const vinte = corpo.itens.find((v) => v.id === 'cp2')
    // 22 usos em outras lojas e 8 na Loja de esportes.
    expect(vinte).toMatchObject({ titulo: 'R$ 20 do shopping', usos: 30 })
    expect(corpo.itens.at(-1)?.id).toBe('cp-semana-do-cliente')
  })

  it('o voucher criado aqui já vale no atendimento da loja', async () => {
    const voucher: PedidoCupom = {
      titulo: 'R$ 30 no Dia das Crianças',
      tipo: 'VALOR',
      valor: 3000,
      categoriaAlvo: null,
      nivelMinimo: 'SEMENTE',
      limitePorCliente: 1,
      validade: hojeEmPalmas(Date.now() + 10 * 86_400_000),
    }
    const criado = await chamar<VoucherDoShopping>('POST', '/api/shopping/cupons', voucher)
    expect(criado.status).toBe(201)
    const atendimento = await chamarNaLoja<Atendimento>('GET', `/api/loja/atendimento/${QR_DA_ANA}`)
    expect(atendimento.corpo.cupons).toContainEqual({ id: criado.corpo.id, titulo: 'R$ 30 no Dia das Crianças', origem: 'SHOPPING' })
  })
})
