import { beforeEach, describe, expect, it } from 'vitest'
import { reiniciarMocks, responderMock } from '../../src/mocks/loja'
import { QR_DA_ANA } from '../../src/loja/telas/atendimento/demo'
import type { Extrato, RespostaLogin } from '../../src/tipos/loja'

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

describe('mocks: GET /api/loja/extrato', () => {
  it('soma as compras do período e separa o desconto da loja do voucher do shopping', async () => {
    const { status, corpo } = await chamar<Extrato>('GET', '/api/loja/extrato?periodo=90d&tamanho=100')
    expect(status).toBe(200)
    const { resumo, lancamentos } = corpo
    expect(resumo.compras).toBe(50)
    expect(lancamentos.total).toBe(50)
    expect(resumo.pagoCentavos).toBe(resumo.brutoCentavos - resumo.descontoLojaCentavos - resumo.descontoShoppingCentavos)
    expect(resumo.descontoShoppingCentavos).toBe(8 * 2000)
    // Mais nova primeiro.
    const datas = lancamentos.itens.map((l) => l.criadoEm)
    expect(datas).toEqual([...datas].sort().reverse())
    // Voucher do shopping traz o reembolso; os de mais de 30 dias já foram pagos.
    const comVoucher = lancamentos.itens.filter((l) => l.descontoShoppingCentavos > 0)
    expect(comVoucher.every((l) => l.reembolso !== null)).toBe(true)
    expect(corpo.reembolsos.pendenteCentavos).toBe(4 * 2000)
  })

  it('a compra com voucher registrada no atendimento entra no extrato com reembolso a receber', async () => {
    const antes = await chamar<Extrato>('GET', '/api/loja/extrato?periodo=7d')
    await chamar('POST', '/api/loja/compras', { qrToken: QR_DA_ANA, valorCentavos: 45980, cupons: ['cp1', 'cp2'] })
    const depois = await chamar<Extrato>('GET', '/api/loja/extrato?periodo=7d')
    expect(depois.corpo.resumo.compras).toBe(antes.corpo.resumo.compras + 1)
    expect(depois.corpo.lancamentos.itens[0]).toMatchObject({
      cliente: 'Ana',
      brutoCentavos: 45980,
      descontoLojaCentavos: 4598,
      descontoShoppingCentavos: 2000,
      pagoCentavos: 39382,
      reembolso: { status: 'PENDENTE', pagoEm: null },
    })
    expect(depois.corpo.reembolsos.pendenteCentavos).toBe(antes.corpo.reembolsos.pendenteCentavos + 2000)
  })

  it('pagina e recusa período desconhecido', async () => {
    const pagina2 = await chamar<Extrato>('GET', '/api/loja/extrato?periodo=90d&pagina=2&tamanho=20')
    expect(pagina2.corpo.lancamentos.itens).toHaveLength(20)
    const errado = await chamar('GET', '/api/loja/extrato?periodo=1a')
    expect(errado.status).toBe(400)
  })
})
