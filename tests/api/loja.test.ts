// Rotas do painel da loja (docs/testes.md: TA05, TA06, TA15, TA23 a TA28 e TA45 a TA48): o atendimento
// pelo QR, a compra com itens e cupons item por item, e a resposta da loja à reserva.
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

/** Um tênis de R$ 399,90 do catálogo da Loja A, como item da compra. */
const TENIS = { produtoId: 'p-pulse', quantidade: 1 }
/** Duas camisetas de R$ 79,90. */
const CAMISETAS = { produtoId: 'p-camiseta', quantidade: 2 }

const patch = (id: string, corpo: Record<string, unknown>, usuario = LOJISTA_A) =>
  chamar(mudarReserva, { metodo: 'PATCH', url: `/api/loja/reservas/${id}`, params: { id }, corpo, usuario })

describe('GET /api/loja/atendimento/{qr}', () => {
  it('TA23: ficha filtrada pelas categorias da loja, reservas ativas e cupons que valem aqui', async () => {
    await reserva('r-sep', 'SEPARADA', { pago: 1, forma: 'PIX' })
    await reserva('r-outra-loja', 'SEPARADA', { loja: 'loja-b', produto: 'p-perfume' })
    // A primeira foto do produto vai junto, para a miniatura no balcão.
    await env.DB.prepare(`UPDATE produto SET fotos = '["/produtos/pulse.webp","/produtos/pulse-2.webp"]' WHERE id = 'p-pulse'`).run()
    const r = await chamar(atendimento, { url: '/api/loja/atendimento/q-ana', params: { qr: 'q-ana' }, usuario: LOJISTA_A })
    expect(r.status).toBe(200)
    expect(r.corpo).toEqual({
      cliente: { nome: 'Ana', nivel: 'CAPIM' },
      ficha: ['Tênis de corrida, número 42, até R$ 400', 'Camisetas dry-fit'],
      reservas: [
        {
          id: 'r-sep',
          produto: 'Tênis de corrida Pulse',
          foto: '/produtos/pulse.webp',
          categoria: 'calcados',
          quantidade: 1,
          tamanho: null,
          cor: null,
          brutoCentavos: 39990,
          descontoCentavos: 0,
          precoCentavos: 39990,
          cupom: null,
          status: 'SEPARADA',
          pago: true,
          podeRetirar: true,
        },
      ],
      cupons: [
        { id: 'cp-a-10', titulo: '10% em calçados', origem: 'LOJA', tipo: 'PERCENTUAL', categoria: 'calcados', paraQueVale: 'Calçados' },
        { id: 'cp-a-15', titulo: 'R$ 15 em camisetas', origem: 'LOJA', tipo: 'VALOR', categoria: 'roupas', paraQueVale: 'Roupas' },
        { id: 'cp-shopping-20', titulo: 'R$ 20 em qualquer loja', origem: 'SHOPPING', tipo: 'VALOR', categoria: null, paraQueVale: null },
      ],
    })
  })

  it('os cupons que dão desconto vêm antes dos brindes, para o caixa marcar o voucher certo', async () => {
    // O brinde do shopping vence antes do voucher de R$ 20, mas vem depois dele.
    await env.DB.prepare(
      `INSERT INTO cupom (id, loja_id, titulo, tipo, valor, nivel_minimo, limite_por_cliente, validade)
       VALUES ('cp-estacionamento', NULL, 'Estacionamento grátis por 2 h', 'BRINDE', 0, 'SEMENTE', 2, '2098-12-31')`,
    ).run()
    const r = await chamar(atendimento, { url: '/api/loja/atendimento/q-ana', params: { qr: 'q-ana' }, usuario: LOJISTA_A })
    expect(r.corpo.cupons.filter((c: { origem: string }) => c.origem === 'SHOPPING').map((c: { id: string }) => c.id)).toEqual([
      'cp-shopping-20',
      'cp-estacionamento',
    ])
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
    const r = await compraDaAna({ itens: [TENIS], cupons: ['cp-a-10', 'cp-shopping-20'] })
    expect(r.status).toBe(201)
    expect(r.corpo).toMatchObject({
      valorBrutoCentavos: 39990,
      descontos: [
        { cupom: 'cp-a-10', centavos: 3999 },
        { cupom: 'cp-shopping-20', centavos: 2000 },
      ],
      valorPagoCentavos: 33991,
      aPagarNoCaixaCentavos: 33991,
      pontosGerados: 339,
      reembolsoGerado: { cupom: 'cp-shopping-20', centavos: 2000 },
    })
    expect(await um("SELECT pontos FROM usuario WHERE id = 'c-ana'")).toEqual({ pontos: 2140 + 339 })
    // O item fica gravado com o desconto dos dois cupons, e o estoque do tênis baixa.
    expect(await um('SELECT descricao, categoria, quantidade, preco_centavos, desconto_centavos FROM compra_item WHERE compra_id = ?1', r.corpo.id)).toEqual({
      descricao: 'Tênis de corrida Pulse',
      categoria: 'calcados',
      quantidade: 1,
      preco_centavos: 39990,
      desconto_centavos: 5999,
    })
    expect(await um("SELECT estoque FROM produto WHERE id = 'p-pulse'")).toEqual({ estoque: 1 })
    expect(await um('SELECT count(*) AS n FROM uso_cupom')).toEqual({ n: 2 })
    expect(await um('SELECT loja_id, valor_centavos, status FROM reembolso')).toEqual({ loja_id: 'loja-a', valor_centavos: 2000, status: 'PENDENTE' })
    expect(await um('SELECT com_ficha, origem FROM compra WHERE id = ?1', r.corpo.id)).toEqual({ com_ficha: 1, origem: 'CAIXA' })
    // O cupom usado some do próximo atendimento (limite de 1 por cliente).
    const depois = await chamar(atendimento, { url: '/api/loja/atendimento/q-ana', params: { qr: 'q-ana' }, usuario: LOJISTA_A })
    expect(depois.corpo.cupons.map((c: { id: string }) => c.id)).toEqual(['cp-a-15'])
  })

  it('a prévia calcula igual e não grava nada', async () => {
    const r = await compraDaAna({ itens: [TENIS, CAMISETAS], cupons: ['cp-a-10', 'cp-shopping-20'] }, previa)
    expect(r.status).toBe(200)
    // O desconto item por item: os 10% só no tênis; os R$ 20 do voucher repartidos no que sobrou.
    expect(r.corpo.itens.map((i: { descricao: string; descontos: unknown[]; pagoCentavos: number }) => [i.descricao, i.descontos, i.pagoCentavos])).toEqual([
      ['Tênis de corrida Pulse', [{ cupom: 'cp-a-10', centavos: 3999 }, { cupom: 'cp-shopping-20', centavos: 1386 }], 34605],
      ['Camiseta dry-fit', [{ cupom: 'cp-shopping-20', centavos: 614 }], 15366],
    ])
    expect(r.corpo).toMatchObject({
      valorBrutoCentavos: 39990 + 15980,
      descontos: [
        { cupom: 'cp-a-10', centavos: 3999 },
        { cupom: 'cp-shopping-20', centavos: 2000 },
      ],
      valorPagoCentavos: 49971,
      pontosGerados: 499,
      reembolsoGerado: { cupom: 'cp-shopping-20', centavos: 2000 },
    })
    expect(await um("SELECT (SELECT count(*) FROM compra WHERE id NOT LIKE 'co-ana-%') AS compras, (SELECT pontos FROM usuario WHERE id = 'c-ana') AS pontos")).toEqual({
      compras: 0,
      pontos: 2140,
    })
  })

  it('TA26: dois cupons da mesma loja é 422 e nada é gravado', async () => {
    const r = await compraDaAna({ itens: [TENIS, CAMISETAS], cupons: ['cp-a-10', 'cp-a-15'] })
    expect(r.status).toBe(422)
    expect(r.corpo.erro).toBe('CUPONS_INCOMPATIVEIS')
    expect(await um("SELECT count(*) AS n FROM compra WHERE id NOT LIKE 'co-ana-%'")).toEqual({ n: 0 })
  })

  it('cupom vencido, de outra loja, acima do nível ou que não existe é 422 CUPOM_INVALIDO', async () => {
    for (const cupom of ['cp-a-vencido', 'cp-b-5', 'cp-a-dourado', 'cp-nao-existe']) {
      const r = await compraDaAna({ itens: [TENIS], cupons: [cupom] })
      expect(r.status, cupom).toBe(422)
      expect(r.corpo.erro, cupom).toBe('CUPOM_INVALIDO')
    }
  })

  it('cupom que cobre tudo: compra com valor zero e zero pontos', async () => {
    await env.DB.prepare("UPDATE produto SET preco_centavos = 1500 WHERE id = 'p-camiseta'").run()
    const r = await compraDaAna({ itens: [{ produtoId: 'p-camiseta', quantidade: 1 }], cupons: ['cp-a-15'] })
    expect(r.status).toBe(201)
    expect(r.corpo).toMatchObject({ valorPagoCentavos: 0, pontosGerados: 0 })
  })

  it('TA46: "10% em calçados" numa camiseta é recusado; com o tênis junto, desconta só no tênis', async () => {
    const soCamiseta = await compraDaAna({ itens: [CAMISETAS], cupons: ['cp-a-10'] })
    expect(soCamiseta.status).toBe(422)
    expect(soCamiseta.corpo).toMatchObject({
      erro: 'CUPOM_INVALIDO',
      mensagem: 'O cupom "10% em calçados" vale só para calçados, e a compra não tem itens dessa categoria.',
    })
    // Valor avulso ("Outros") não tem categoria: cupom de categoria não entra.
    const avulso = await compraDaAna({ itens: [{ valorCentavos: 5000, descricao: 'Outros' }], cupons: ['cp-a-15'] })
    expect(avulso.status).toBe(422)
    const juntos = await compraDaAna({ itens: [TENIS, CAMISETAS], cupons: ['cp-a-10'] }, previa)
    expect(juntos.corpo.itens.map((i: { descontos: unknown[] }) => i.descontos)).toEqual([[{ cupom: 'cp-a-10', centavos: 3999 }], []])
  })

  it('TA47: compra com reserva, produto do catálogo e valor avulso, e o formato antigo ainda vale', async () => {
    await reserva('r-conf', 'CONFIRMADA')
    const r = await compraDaAna({ itens: [{ reservaId: 'r-conf' }, CAMISETAS, { valorCentavos: 1000, descricao: 'Sacola' }], cupons: ['cp-shopping-20'] })
    expect(r.status).toBe(201)
    expect(r.corpo.itens.map((i: { descricao: string; reservaId: string | null }) => [i.descricao, i.reservaId])).toEqual([
      ['Tênis de corrida Pulse', 'r-conf'],
      ['Camiseta dry-fit', null],
      ['Sacola', null],
    ])
    expect(await um("SELECT status FROM reserva WHERE id = 'r-conf'")).toEqual({ status: 'RETIRADA' })
    expect(await um('SELECT count(*) AS n FROM compra_item WHERE compra_id = ?1', r.corpo.id)).toEqual({ n: 3 })
    // A cliente é avisada da retirada e dos pontos.
    expect(await um("SELECT count(*) AS n FROM notificacao WHERE usuario_id = 'c-ana' AND titulo = 'Reserva retirada'")).toEqual({ n: 1 })
    // Sem itens, valorCentavos vira "Outros", como antes.
    const antigo = await compraDaAna({ valorCentavos: 2500, cupons: [] })
    expect(antigo.status).toBe(201)
    expect(antigo.corpo.itens).toMatchObject([{ descricao: 'Outros', categoria: null, brutoCentavos: 2500 }])
  })

  it('TA27: retirar reserva paga com Pix usa o valor dela; a segunda vez é 409', async () => {
    await reserva('r-pix', 'SEPARADA', { pago: 1, forma: 'PIX' })
    const r = await compraDaAna({ itens: [{ reservaId: 'r-pix' }], cupons: [] })
    expect(r.status).toBe(201)
    // Já pago: entra no valor e nos pontos, mas o caixa não cobra.
    expect(r.corpo).toMatchObject({ valorBrutoCentavos: 39990, valorPagoCentavos: 39990, aPagarNoCaixaCentavos: 0, pontosGerados: 399 })
    expect(await um("SELECT status FROM reserva WHERE id = 'r-pix'")).toEqual({ status: 'RETIRADA' })
    const de_novo = await compraDaAna({ itens: [{ reservaId: 'r-pix' }], cupons: [] })
    expect(de_novo.status).toBe(409)
    expect(de_novo.corpo.mensagem).toBe('Essa reserva já foi retirada.')
  })

  it('reserva paga com Pix não aceita cupom do caixa; reserva pendente precisa ser confirmada antes', async () => {
    await reserva('r-pix', 'SEPARADA', { pago: 1, forma: 'PIX' })
    const comCupom = await compraDaAna({ itens: [{ reservaId: 'r-pix' }], cupons: ['cp-a-10'] })
    expect(comCupom.status).toBe(422)
    await reserva('r-pend', 'PENDENTE')
    const pendente = await compraDaAna({ itens: [{ reservaId: 'r-pend' }], cupons: [] })
    expect(pendente.status).toBe(409)
    expect(pendente.corpo.mensagem).toBe('Confirme a reserva antes de entregar.')
  })

  it('valida o corpo como o mock: sem QR, valor quebrado ou cupons fora do formato é 400', async () => {
    for (const corpo of [{ qrToken: '' }, { valorCentavos: 10.5 }, { valorCentavos: 100, cupons: 'cp-a-10' }, { itens: [{ nada: 1 }] }, { itens: [] }]) {
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
    // As pendentes primeiro (a loja precisa responder), depois as que vencem antes.
    expect(todas.corpo.itens.map((r: { id: string }) => r.id)).toEqual(['r2', 'r3', 'r1'])
    expect(todas.corpo.pendentes).toBe(1)
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

  it('TA45: confirmar com a hora: o prazo para retirar conta dela, e a cliente é avisada; depois, separar', async () => {
    await reserva('r1', 'PENDENTE')
    // Pendente, não dá para separar sem confirmar.
    expect((await patch('r1', { status: 'SEPARADA' })).status).toBe(409)
    const confirmar = await patch('r1', { status: 'CONFIRMADA', prontaAs: '23:59' })
    expect(confirmar.status).toBe(200)
    expect(confirmar.corpo).toMatchObject({ id: 'r1', status: 'CONFIRMADA', cliente: 'Ana' })
    const { prontaEm, expiraEm } = confirmar.corpo
    // Pagar na loja: 4 h a partir da hora em que fica pronta.
    expect(new Date(expiraEm).getTime() - new Date(prontaEm).getTime()).toBe(4 * 60 * 60 * 1000)
    const aviso = await um<{ titulo: string; corpo: string; destino: string }>(
      "SELECT titulo, corpo, destino FROM notificacao WHERE usuario_id = 'c-ana' AND titulo LIKE '%confirmou%'",
    )
    expect(aviso).toMatchObject({ titulo: 'Loja A confirmou sua reserva', destino: '/reserva/r1' })
    expect(aviso.corpo).toMatch(/fica pronto para retirar a partir das \d\d:\d\d\./)
    const separar = await patch('r1', { status: 'SEPARADA' })
    expect(separar.corpo.status).toBe('SEPARADA')
    expect(await um("SELECT count(*) AS n FROM notificacao WHERE usuario_id = 'c-ana' AND titulo = 'Sua reserva está separada'")).toEqual({ n: 1 })
    // Hora fora do formato é 400.
    await reserva('r2', 'PENDENTE')
    expect((await patch('r2', { status: 'CONFIRMADA', prontaAs: '15h' })).status).toBe(400)
  })

  it('TA15 e TA48: recusar com motivo devolve o estoque, pede o estorno do Pix e solta o cupom', async () => {
    await reserva('r1', 'CONFIRMADA', { pago: 1, forma: 'PIX' })
    await env.DB.prepare("UPDATE reserva SET cupom_id = 'cp-a-10', desconto_centavos = 3999 WHERE id = 'r1'").run()
    await env.DB.prepare("UPDATE produto SET estoque = estoque - 1 WHERE id = 'p-pulse'").run()
    // Sem motivo é 400; a loja não cancela (é do cliente) nem marca retirada (é o caixa).
    expect((await patch('r1', { status: 'RECUSADA' })).status).toBe(400)
    expect((await patch('r1', { status: 'CANCELADA' })).corpo.mensagem).toMatch(/Quem cancela é o cliente/)
    expect((await patch('r1', { status: 'RETIRADA' })).corpo.mensagem).toMatch(/Atendimento/)
    const recusar = await patch('r1', { status: 'RECUSADA', motivo: 'O último par veio com defeito' })
    expect(recusar.status).toBe(200)
    expect(recusar.corpo).toMatchObject({ status: 'RECUSADA', motivoRecusa: 'O último par veio com defeito', estornoSolicitado: true })
    expect(await um("SELECT estoque FROM produto WHERE id = 'p-pulse'")).toEqual({ estoque: 2 })
    const aviso = await um<{ corpo: string }>("SELECT corpo FROM notificacao WHERE usuario_id = 'c-ana' AND titulo = 'Loja A recusou sua reserva'")
    expect(aviso.corpo).toBe('Tênis de corrida Pulse: O último par veio com defeito. O estorno do Pix foi pedido.')
    // O cupom volta a valer no balcão.
    const depois = await chamar(atendimento, { url: '/api/loja/atendimento/q-ana', params: { qr: 'q-ana' }, usuario: LOJISTA_A })
    expect(depois.corpo.cupons.map((c: { id: string }) => c.id)).toContain('cp-a-10')
  })

  it('TA28: transição proibida é 409; TA06: reserva de outra loja é 403 e nada muda', async () => {
    await reserva('r-ret', 'RETIRADA')
    const proibida = await patch('r-ret', { status: 'RECUSADA', motivo: 'Sem estoque' })
    expect(proibida.status).toBe(409)
    expect(proibida.corpo.erro).toBe('TRANSICAO_INVALIDA')
    await reserva('r-a', 'PENDENTE')
    const outraLoja = await patch('r-a', { status: 'CONFIRMADA' }, LOJISTA_B)
    expect(outraLoja.status).toBe(403)
    expect(await um("SELECT status FROM reserva WHERE id = 'r-a'")).toEqual({ status: 'PENDENTE' })
  })
})
