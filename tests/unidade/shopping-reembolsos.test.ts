import { beforeEach, describe, expect, it } from 'vitest'
import { reiniciarMocks as reiniciarLoja, responderMock as responderDaLoja } from '../../src/mocks/loja'
import { reiniciarMocks, responderMock } from '../../src/mocks/shopping'
import { QR_DA_ANA } from '../../src/loja/telas/atendimento/demo'
import type { Extrato } from '../../src/tipos/loja'
import type { ReembolsoDoShopping, Reembolsos, RespostaLogin } from '../../src/tipos/shopping'

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

describe('mocks do shopping: reembolsos', () => {
  it('agrupa por loja, quem mais tem a receber primeiro, com os totais', async () => {
    const { corpo } = await chamar<Reembolsos>('GET', '/api/shopping/reembolsos?status=PENDENTE')
    const pendentes = corpo.lojas.map((l) => l.pendenteCentavos)
    expect(pendentes).toEqual([...pendentes].sort((a, b) => b - a))
    expect(corpo.totais.pendenteCentavos).toBe(pendentes.reduce((s, v) => s + v, 0))
    expect(corpo.lojas.every((l) => l.itens.every((i) => i.status === 'PENDENTE'))).toBe(true)
    expect(corpo.lojas.find((l) => l.loja.id === 'loja-esportes')).toMatchObject({ pendenteCentavos: 8000, loja: { unidade: 'LOJA 19' } })
  })

  it('o voucher usado no caixa da loja aparece a pagar, e pago aqui aparece pago no extrato da loja', async () => {
    await chamarNaLoja('POST', '/api/loja/compras', { qrToken: QR_DA_ANA, valorCentavos: 45980, cupons: ['cp2'] })
    const antes = await chamar<Reembolsos>('GET', '/api/shopping/reembolsos?status=PENDENTE')
    const daLoja = antes.corpo.lojas.find((l) => l.loja.id === 'loja-esportes')!
    expect(daLoja.pendenteCentavos).toBe(10000)
    const novo = daLoja.itens[0]
    expect(novo).toMatchObject({ centavos: 2000, cupom: { titulo: 'R$ 20 do shopping' }, status: 'PENDENTE' })

    const pago = await chamar<ReembolsoDoShopping>('PATCH', `/api/shopping/reembolsos/${novo.id}`, { status: 'PAGO' })
    expect(pago.corpo).toMatchObject({ status: 'PAGO', pagoEm: expect.any(String) })
    const deNovo = await chamar('PATCH', `/api/shopping/reembolsos/${novo.id}`, { status: 'PAGO' })
    expect(deNovo.corpo).toMatchObject({ status: 409, erro: 'TRANSICAO_INVALIDA' })

    const extrato = await chamarNaLoja<Extrato>('GET', '/api/loja/extrato?periodo=7d')
    expect(extrato.corpo.lancamentos.itens[0].reembolso).toMatchObject({ status: 'PAGO' })
    expect(extrato.corpo.reembolsos.pendenteCentavos).toBe(8000)
  })

  it('recusa status que não seja PAGO', async () => {
    const { status } = await chamar('PATCH', '/api/shopping/reembolsos/re1', { status: 'PENDENTE' })
    expect(status).toBe(400)
  })
})
