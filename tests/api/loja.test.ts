// Rotas do painel da loja (docs/testes.md: TA05, TA06, TA15, TA23 a TA28), no formato dos mocks da fase-4.
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { onRequestGet as atendimento } from '../../functions/api/loja/atendimento/[qr]'
import { onRequestPost as compras } from '../../functions/api/loja/compras/index'
import { onRequestPost as previa } from '../../functions/api/loja/compras/previa'
import { onRequestPatch as mudarReserva } from '../../functions/api/loja/reservas/[id]'
import { onRequestGet as reservas } from '../../functions/api/loja/reservas/index'
import { ANA, chamar, LOJISTA_A, LOJISTA_B } from '../workers/rotas'

const um = async <T>(sql: string, ...valores: unknown[]) => (await env.DB.prepare(sql).bind(...valores).first<T>())!

/** Reserva direto no banco, para os testes do balcão. */
async function reserva(id: string, status: string, { pago = 0, forma = 'NA_LOJA', expira = '+4 hours', loja = 'loja-a', produto = 'p-pulse' } = {}) {
  await env.DB.prepare(
    `INSERT INTO reserva (id, cliente_id, produto_id, loja_id, quantidade, preco_centavos, status, forma_pagamento, pago, expira_em)
     VALUES (?1, 'c-ana', ?2, ?3, 1, (SELECT preco_centavos FROM produto WHERE id = ?2), ?4, ?5, ?6, datetime('now', ?7))`,
  )
    .bind(id, produto, loja, status, forma, pago, expira)
    .run()
}

const compraDaAna = (corpo: Record<string, unknown>, rota = compras) =>
  chamar(rota, { metodo: 'POST', url: '/api/loja/compras', corpo: { qrToken: 'q-ana', ...corpo }, usuario: LOJISTA_A })

describe('GET /api/loja/atendimento/{qr}', () => {
  it('TA23: ficha filtrada pelas categorias da loja, reservas ativas e cupons que valem aqui', async () => {
    await reserva('r-sep', 'SEPARADA', { pago: 1, forma: 'PIX' })
    await reserva('r-outra-loja', 'SEPARADA', { loja: 'loja-b', produto: 'p-perfume' })
    const r = await chamar(atendimento, { url: '/api/loja/atendimento/q-ana', params: { qr: 'q-ana' }, usuario: LOJISTA_A })
    expect(r.status).toBe(200)
    expect(r.corpo).toEqual({
      cliente: { nome: 'Ana', nivel: 'CAPIM' },
      ficha: ['Tênis de corrida, número 42, até R$ 400', 'Camisetas dry-fit'],
      reservas: [{ id: 'r-sep', produto: 'Tênis de corrida Pulse', status: 'SEPARADA', pago: true }],
      cupons: [
        { id: 'cp-a-10', titulo: '10% em calçados', origem: 'LOJA' },
        { id: 'cp-a-15', titulo: 'R$ 15 em camisetas', origem: 'LOJA' },
        { id: 'cp-shopping-20', titulo: 'R$ 20 em qualquer loja', origem: 'SHOPPING' },
      ],
    })
  })

  it('TA23: cliente sem consentimento chega sem ficha; QR desconhecido é 404', async () => {
    const bruno = await chamar(atendimento, { url: '/api/loja/atendimento/q-bruno', params: { qr: 'q-bruno' }, usuario: LOJISTA_A })
    expect(bruno.corpo.ficha).toEqual([])
    const nada = await chamar(atendimento, { url: '/api/loja/atendimento/q-x', params: { qr: 'q-x' }, usuario: LOJISTA_A })
    expect(nada.status).toBe(404)
    expect(nada.corpo.erro).toBe('NAO_ENCONTRADO')
  })

  it('TA24: a resposta nunca traz a conversa com a Capi', async () => {
    await env.DB.prepare("INSERT INTO mensagem (id, cliente_id, papel, conteudo) VALUES ('m1', 'c-ana', 'CLIENTE', 'segredo da conversa')").run()
    const r = await chamar(atendimento, { url: '/api/loja/atendimento/q-ana', params: { qr: 'q-ana' }, usuario: LOJISTA_A })
    expect(JSON.stringify(r.corpo)).not.toContain('segredo da conversa')
  })

  it('TA05: cliente no painel da loja é 403; sem token, 401', async () => {
    const cliente = await chamar(atendimento, { url: '/api/loja/atendimento/q-ana', params: { qr: 'q-ana' }, usuario: ANA })
    expect(cliente.status).toBe(403)
    const anonimo = await chamar(atendimento, { url: '/api/loja/atendimento/q-ana', params: { qr: 'q-ana' } })
    expect(anonimo.status).toBe(401)
  })
})

describe('POST /api/loja/compras', () => {
  it('TA25: cupom da loja e voucher do shopping: descontos, pontos sobre o pago e reembolso', async () => {
    const r = await compraDaAna({ valorCentavos: 45980, cupons: ['cp-a-10', 'cp-shopping-20'] })
    expect(r.status).toBe(201)
    expect(r.corpo).toMatchObject({
      valorBrutoCentavos: 45980,
      descontos: [
        { cupom: 'cp-a-10', centavos: 4598 },
        { cupom: 'cp-shopping-20', centavos: 2000 },
      ],
      valorPagoCentavos: 39382,
      pontosGerados: 393,
      reembolsoGerado: { cupom: 'cp-shopping-20', centavos: 2000 },
    })
    expect(await um("SELECT pontos FROM usuario WHERE id = 'c-ana'")).toEqual({ pontos: 2140 + 393 })
    expect(await um('SELECT count(*) AS n FROM uso_cupom')).toEqual({ n: 2 })
    expect(await um('SELECT loja_id, valor_centavos, status FROM reembolso')).toEqual({ loja_id: 'loja-a', valor_centavos: 2000, status: 'PENDENTE' })
    expect(await um('SELECT com_ficha, origem FROM compra WHERE id = ?1', r.corpo.id)).toEqual({ com_ficha: 1, origem: 'CAIXA' })
    // O cupom usado some do próximo atendimento (limite de 1 por cliente).
    const depois = await chamar(atendimento, { url: '/api/loja/atendimento/q-ana', params: { qr: 'q-ana' }, usuario: LOJISTA_A })
    expect(depois.corpo.cupons.map((c: { id: string }) => c.id)).toEqual(['cp-a-15'])
  })

  it('a prévia calcula igual e não grava nada', async () => {
    const r = await compraDaAna({ valorCentavos: 45980, cupons: ['cp-a-10', 'cp-shopping-20'] }, previa)
    expect(r.status).toBe(200)
    expect(r.corpo).toEqual({
      valorBrutoCentavos: 45980,
      descontos: [
        { cupom: 'cp-a-10', centavos: 4598 },
        { cupom: 'cp-shopping-20', centavos: 2000 },
      ],
      valorPagoCentavos: 39382,
      pontosGerados: 393,
      reembolsoGerado: { cupom: 'cp-shopping-20', centavos: 2000 },
    })
    expect(await um("SELECT (SELECT count(*) FROM compra WHERE id NOT LIKE 'co-ana-%') AS compras, (SELECT pontos FROM usuario WHERE id = 'c-ana') AS pontos")).toEqual({
      compras: 0,
      pontos: 2140,
    })
  })

  it('TA26: dois cupons da mesma loja é 422 e nada é gravado', async () => {
    const r = await compraDaAna({ valorCentavos: 45980, cupons: ['cp-a-10', 'cp-a-15'] })
    expect(r.status).toBe(422)
    expect(r.corpo.erro).toBe('CUPONS_INCOMPATIVEIS')
    expect(await um("SELECT count(*) AS n FROM compra WHERE id NOT LIKE 'co-ana-%'")).toEqual({ n: 0 })
  })

  it('cupom vencido, de outra loja, acima do nível ou que não existe é 422 CUPOM_INVALIDO', async () => {
    for (const cupom of ['cp-a-vencido', 'cp-b-5', 'cp-a-dourado', 'cp-nao-existe']) {
      const r = await compraDaAna({ valorCentavos: 10000, cupons: [cupom] })
      expect(r.status, cupom).toBe(422)
      expect(r.corpo.erro, cupom).toBe('CUPOM_INVALIDO')
    }
  })

  it('cupom que cobre tudo: compra com valor zero e zero pontos', async () => {
    const r = await compraDaAna({ valorCentavos: 1500, cupons: ['cp-a-15'] })
    expect(r.status).toBe(201)
    expect(r.corpo).toMatchObject({ valorPagoCentavos: 0, pontosGerados: 0 })
  })

  it('TA27: retirar reserva paga com Pix usa o valor dela; a segunda vez é 409', async () => {
    await reserva('r-pix', 'SEPARADA', { pago: 1, forma: 'PIX' })
    const r = await compraDaAna({ valorCentavos: 0, cupons: [], reservaId: 'r-pix' })
    expect(r.status).toBe(201)
    expect(r.corpo).toMatchObject({ valorBrutoCentavos: 39990, valorPagoCentavos: 39990, pontosGerados: 399 })
    expect(await um("SELECT status FROM reserva WHERE id = 'r-pix'")).toEqual({ status: 'RETIRADA' })
    const de_novo = await compraDaAna({ valorCentavos: 0, cupons: [], reservaId: 'r-pix' })
    expect(de_novo.status).toBe(409)
    expect(de_novo.corpo.mensagem).toBe('Essa reserva já foi retirada.')
  })

  it('reserva paga com Pix não aceita cupom; reserva pendente precisa ser separada antes', async () => {
    await reserva('r-pix', 'SEPARADA', { pago: 1, forma: 'PIX' })
    const comCupom = await compraDaAna({ valorCentavos: 0, cupons: ['cp-a-10'], reservaId: 'r-pix' })
    expect(comCupom.status).toBe(422)
    await reserva('r-pend', 'PENDENTE')
    const pendente = await compraDaAna({ valorCentavos: 39990, cupons: [], reservaId: 'r-pend' })
    expect(pendente.status).toBe(409)
    expect(pendente.corpo.mensagem).toBe('Separe a reserva antes de entregar.')
  })

  it('valida o corpo como o mock: sem QR, valor quebrado ou cupons fora do formato é 400', async () => {
    for (const corpo of [{ qrToken: '' }, { valorCentavos: 10.5 }, { valorCentavos: 100, cupons: 'cp-a-10' }]) {
      const r = await compraDaAna({ valorCentavos: 100, ...corpo })
      expect(r.status, JSON.stringify(corpo)).toBe(400)
    }
  })
})

describe('reservas do painel', () => {
  it('lista só as da loja do token, as que vencem primeiro na frente, com filtro de status', async () => {
    await reserva('r1', 'SEPARADA', { expira: '+30 hours', pago: 1, forma: 'PIX' })
    await reserva('r2', 'PENDENTE', { expira: '+2 hours' })
    await reserva('r3', 'RETIRADA', { expira: '-1 hours' })
    await reserva('r-b', 'PENDENTE', { loja: 'loja-b', produto: 'p-perfume' })
    const todas = await chamar(reservas, { url: '/api/loja/reservas', usuario: LOJISTA_A })
    expect(todas.corpo.total).toBe(3)
    expect(todas.corpo.itens.map((r: { id: string }) => r.id)).toEqual(['r3', 'r2', 'r1'])
    expect(todas.corpo.itens[2]).toMatchObject({ produto: 'Tênis de corrida Pulse', cliente: 'Ana', pago: true, formaPagamento: 'PIX' })
    const ativas = await chamar(reservas, { url: '/api/loja/reservas?status=PENDENTE,SEPARADA', usuario: LOJISTA_A })
    expect(ativas.corpo.itens.map((r: { id: string }) => r.id)).toEqual(['r2', 'r1'])
    const ruim = await chamar(reservas, { url: '/api/loja/reservas?status=QUALQUER', usuario: LOJISTA_A })
    expect(ruim.status).toBe(400)
  })

  it('reserva vencida aparece como EXPIRADA e devolve o estoque (RN01, RN03)', async () => {
    await reserva('r-velha', 'PENDENTE', { expira: '-1 minutes' })
    const r = await chamar(reservas, { url: '/api/loja/reservas?status=EXPIRADA', usuario: LOJISTA_A })
    expect(r.corpo.itens.map((x: { id: string }) => x.id)).toEqual(['r-velha'])
    expect(await um("SELECT estoque FROM produto WHERE id = 'p-pulse'")).toEqual({ estoque: 3 })
  })

  it('PATCH segue o diagrama: separar avisa o cliente; cancelar devolve o estoque (TA15)', async () => {
    await reserva('r1', 'PENDENTE')
    const separar = await chamar(mudarReserva, { metodo: 'PATCH', url: '/api/loja/reservas/r1', params: { id: 'r1' }, corpo: { status: 'SEPARADA' }, usuario: LOJISTA_A })
    expect(separar.status).toBe(200)
    expect(separar.corpo).toMatchObject({ id: 'r1', status: 'SEPARADA', cliente: 'Ana' })
    expect(await um("SELECT tipo FROM notificacao WHERE usuario_id = 'c-ana'")).toEqual({ tipo: 'RESERVA' })
    const cancelar = await chamar(mudarReserva, { metodo: 'PATCH', url: '/api/loja/reservas/r1', params: { id: 'r1' }, corpo: { status: 'CANCELADA' }, usuario: LOJISTA_A })
    expect(cancelar.corpo.status).toBe('CANCELADA')
    expect(await um("SELECT estoque FROM produto WHERE id = 'p-pulse'")).toEqual({ estoque: 3 })
  })

  it('TA28: transição proibida é 409; TA06: reserva de outra loja é 403 e nada muda', async () => {
    await reserva('r-ret', 'RETIRADA')
    const proibida = await chamar(mudarReserva, { metodo: 'PATCH', url: '/api/loja/reservas/r-ret', params: { id: 'r-ret' }, corpo: { status: 'CANCELADA' }, usuario: LOJISTA_A })
    expect(proibida.status).toBe(409)
    expect(proibida.corpo.erro).toBe('TRANSICAO_INVALIDA')
    await reserva('r-a', 'PENDENTE')
    const outraLoja = await chamar(mudarReserva, { metodo: 'PATCH', url: '/api/loja/reservas/r-a', params: { id: 'r-a' }, corpo: { status: 'CANCELADA' }, usuario: LOJISTA_B })
    expect(outraLoja.status).toBe(403)
    expect(await um("SELECT status FROM reserva WHERE id = 'r-a'")).toEqual({ status: 'PENDENTE' })
  })
})
