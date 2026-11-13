// O extrato da loja (RF25) e os reembolsos do shopping (RF31): o voucher usado no caixa vira
// reembolso a receber no extrato, o shopping paga e o extrato mostra pago (RN11).
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { onRequestPost as compras } from '../../functions/api/loja/compras/index'
import { onRequestGet as extrato } from '../../functions/api/loja/extrato'
import { onRequestPatch as pagar } from '../../functions/api/shopping/reembolsos/[id]'
import { onRequestGet as reembolsos } from '../../functions/api/shopping/reembolsos/index'
import { ADMIN, chamar, LOJISTA_A, LOJISTA_B } from '../workers/rotas'

const extratoDa = (usuario = LOJISTA_A, busca = '') => chamar(extrato, { url: `/api/loja/extrato${busca}`, usuario })
const compra = (corpo: Record<string, unknown>, usuario = LOJISTA_A) =>
  chamar(compras, { metodo: 'POST', url: '/api/loja/compras', corpo: { cupons: [], ...corpo }, usuario })
const pagarReembolso = (id: string, corpo: unknown = { status: 'PAGO' }) =>
  chamar(pagar, { metodo: 'PATCH', url: `/api/shopping/reembolsos/${id}`, params: { id }, corpo, usuario: ADMIN })

describe('GET /api/loja/extrato', () => {
  it('soma as compras do caixa no período com os descontos de cada lado', async () => {
    await compra({ qrToken: 'q-ana', valorCentavos: 45980, cupons: ['cp-a-10', 'cp-shopping-20'] })
    await compra({ qrToken: 'q-bruno', valorCentavos: 10000 })
    await compra({ qrToken: 'q-bruno', valorCentavos: 24900 }, LOJISTA_B) // outra loja: fica fora

    const r = await extratoDa()
    expect(r.status).toBe(200)
    expect(r.corpo).toMatchObject({
      periodo: '30d',
      resumo: { compras: 2, brutoCentavos: 55980, descontoLojaCentavos: 4598, descontoShoppingCentavos: 2000, pagoCentavos: 49382 },
      reembolsos: { pendenteCentavos: 2000, pagoNoPeriodoCentavos: 0 },
      lancamentos: { total: 2 },
    })
    const comVoucher = r.corpo.lancamentos.itens.find((l: { cliente: string }) => l.cliente === 'Ana')
    expect(comVoucher).toMatchObject({
      brutoCentavos: 45980,
      descontoLojaCentavos: 4598,
      descontoShoppingCentavos: 2000,
      pagoCentavos: 39382,
      retirada: false,
      reembolso: { status: 'PENDENTE', pagoEm: null },
    })
    expect(r.corpo.lancamentos.itens.find((l: { cliente: string }) => l.cliente === 'Bruno').reembolso).toBeNull()
  })

  it('o período conta pela data da compra, e a lista vem paginada da mais nova para a mais antiga', async () => {
    // tests/seed.sql: compra de R$ 1.400 da Ana na Loja A há 60 dias.
    expect((await extratoDa(LOJISTA_A, '?periodo=30d')).corpo.resumo.compras).toBe(0)
    expect((await extratoDa(LOJISTA_A, '?periodo=90d')).corpo.resumo).toMatchObject({ compras: 1, pagoCentavos: 140000 })
    await compra({ qrToken: 'q-bruno', valorCentavos: 1000 })
    await env.DB.prepare("UPDATE compra SET criado_em = datetime('now', '-2 days') WHERE id <> 'co-ana-1' AND loja_id = 'loja-a'").run()
    await compra({ qrToken: 'q-bruno', valorCentavos: 2000 })
    const pagina = await extratoDa(LOJISTA_A, '?periodo=90d&tamanho=2')
    expect(pagina.corpo.lancamentos.itens.map((l: { pagoCentavos: number }) => l.pagoCentavos)).toEqual([2000, 1000])
    expect(pagina.corpo.lancamentos.total).toBe(3)
    expect((await extratoDa(LOJISTA_A, '?periodo=ontem')).status).toBe(400)
  })

  it('cliente e admin não abrem o extrato da loja', async () => {
    expect((await extratoDa(ADMIN)).status).toBe(403)
  })
})

describe('reembolsos do shopping', () => {
  it('o voucher usado no caixa vira reembolso; pago no shopping, aparece pago no extrato da loja', async () => {
    await compra({ qrToken: 'q-ana', valorCentavos: 45980, cupons: ['cp-shopping-20'] })

    const lista = await chamar(reembolsos, { url: '/api/shopping/reembolsos', usuario: ADMIN })
    expect(lista.status).toBe(200)
    expect(lista.corpo.totais).toEqual({ pendenteCentavos: 2000, lojasComPendencia: 1, pagoUltimos30DiasCentavos: 0 })
    const [daLoja] = lista.corpo.lojas
    expect(daLoja).toMatchObject({
      loja: { id: 'loja-a', nome: 'Loja A', unidade: 'LOJA 10' },
      pendenteCentavos: 2000,
      pagoCentavos: 0,
      itens: [{ cupom: { id: 'cp-shopping-20', titulo: 'R$ 20 em qualquer loja' }, centavos: 2000, status: 'PENDENTE', pagoEm: null }],
    })

    const id = daLoja.itens[0].id
    const pago = await pagarReembolso(id)
    expect(pago.status).toBe(200)
    expect(pago.corpo).toMatchObject({ id, status: 'PAGO' })
    expect(new Date(pago.corpo.pagoEm).getTime()).toBeGreaterThan(Date.now() - 60_000)

    const depois = await chamar(reembolsos, { url: '/api/shopping/reembolsos', usuario: ADMIN })
    expect(depois.corpo.totais).toEqual({ pendenteCentavos: 0, lojasComPendencia: 0, pagoUltimos30DiasCentavos: 2000 })
    expect((await chamar(reembolsos, { url: '/api/shopping/reembolsos?status=PENDENTE', usuario: ADMIN })).corpo.lojas).toEqual([])

    const doLojista = await extratoDa()
    expect(doLojista.corpo.reembolsos).toEqual({ pendenteCentavos: 0, pagoNoPeriodoCentavos: 2000 })
    expect(doLojista.corpo.lancamentos.itens[0].reembolso).toEqual({ status: 'PAGO', pagoEm: pago.corpo.pagoEm })
  })

  it('pago não volta: pagar de novo é 409; outro status, 400; reembolso que não existe, 404', async () => {
    await compra({ qrToken: 'q-ana', valorCentavos: 45980, cupons: ['cp-shopping-20'] })
    const { id } = (await env.DB.prepare('SELECT id FROM reembolso').first<{ id: string }>())!
    await pagarReembolso(id)
    const deNovo = await pagarReembolso(id)
    expect(deNovo.status).toBe(409)
    expect(deNovo.corpo.erro).toBe('TRANSICAO_INVALIDA')
    expect((await pagarReembolso(id, { status: 'PENDENTE' })).status).toBe(400)
    expect((await pagarReembolso('nao-existe')).status).toBe(404)
    expect((await chamar(reembolsos, { url: '/api/shopping/reembolsos?status=TODOS', usuario: ADMIN })).status).toBe(400)
  })
})
