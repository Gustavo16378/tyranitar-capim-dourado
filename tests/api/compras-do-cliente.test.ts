// Minhas compras (TA43): GET /api/me/compras, o histórico de compras do cliente com a loja, a
// data, o valor pago, os cupons usados e os pontos ganhos, da mais nova para a mais antiga.
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { onRequestGet as compras } from '../../functions/api/me/compras'
import { ANA, BRUNO, chamar, LOJISTA_A } from '../workers/rotas'

const listar = (url = '/api/me/compras', usuario = ANA) => chamar(compras, { url, usuario })

/** Uma compra de hoje na Loja A com o cupom da loja e o voucher do shopping. */
async function compraComCupons() {
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO compra (id, cliente_id, loja_id, valor_centavos, origem, pontos_gerados, criado_em)
       VALUES ('co-ana-3', 'c-ana', 'loja-a', 33991, 'CAIXA', 339, '2026-11-12 18:30:00')`,
    ),
    env.DB.prepare("INSERT INTO uso_cupom (compra_id, cupom_id, desconto_centavos) VALUES ('co-ana-3', 'cp-shopping-20', 2000)"),
    env.DB.prepare("INSERT INTO uso_cupom (compra_id, cupom_id, desconto_centavos) VALUES ('co-ana-3', 'cp-a-10', 3999)"),
  ])
}

describe('GET /api/me/compras', () => {
  it('TA43: as compras da cliente, a mais nova primeiro, com loja, data, valor pago, cupons e pontos', async () => {
    await compraComCupons()
    const r = await listar()
    expect(r.status).toBe(200)
    expect(r.corpo.total).toBe(3)
    expect(r.corpo.itens.map((c: { id: string }) => c.id)).toEqual(['co-ana-3', 'co-ana-2', 'co-ana-1'])
    expect(r.corpo.itens[0]).toEqual({
      id: 'co-ana-3',
      criadoEm: '2026-11-12T18:30:00.000Z',
      loja: { id: 'loja-a', nome: 'Loja A', piso: 1, mapaId: 'mapa-loja-a' },
      valorPagoCentavos: 33991,
      // O maior desconto primeiro.
      cupons: [
        { titulo: '10% em calçados', descontoCentavos: 3999 },
        { titulo: 'R$ 20 em qualquer loja', descontoCentavos: 2000 },
      ],
      pontosGerados: 339,
    })
    expect(r.corpo.itens[1]).toMatchObject({
      loja: { nome: 'Loja B' },
      valorPagoCentavos: 74000,
      cupons: [],
      pontosGerados: 740,
    })
  })

  it('pagina como as outras listas', async () => {
    await compraComCupons()
    const pagina2 = await listar('/api/me/compras?pagina=2&tamanho=2')
    expect(pagina2.corpo).toMatchObject({ total: 3, itens: [{ id: 'co-ana-1' }] })
    expect((await listar('/api/me/compras?tamanho=0')).status).toBe(400)
    expect((await listar('/api/me/compras?tamanho=101')).status).toBe(400)
  })

  it('cada cliente vê só as próprias compras', async () => {
    expect((await listar('/api/me/compras', BRUNO)).corpo).toEqual({ itens: [], total: 0 })
  })

  it('sem login 401; lojista 403', async () => {
    expect((await chamar(compras, { url: '/api/me/compras' })).status).toBe(401)
    expect((await listar('/api/me/compras', LOJISTA_A)).status).toBe(403)
  })
})
