// Cupons (RF23) e relatório de desempenho (RF24) do painel da loja, contra o banco de teste.
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { onRequestGet as listarCupons, onRequestPost as criarCupom } from '../../functions/api/loja/cupons'
import { onRequestGet as relatorio } from '../../functions/api/loja/relatorios'
import { chamar, LOJISTA_A, LOJISTA_B } from '../workers/rotas'

const sql = (comando: string, ...valores: unknown[]) => env.DB.prepare(comando).bind(...valores).run()

async function reserva(id: string, status: string, { produto = 'p-pulse', criado = '-1 hours' } = {}) {
  await sql(
    `INSERT INTO reserva (id, cliente_id, produto_id, loja_id, quantidade, preco_centavos, status, forma_pagamento, expira_em, criado_em)
     SELECT ?1, 'c-ana', id, loja_id, 1, preco_centavos, ?2, 'NA_LOJA', datetime('now', '+4 hours'), datetime('now', ?3)
     FROM produto WHERE id = ?4`,
    id,
    status,
    criado,
    produto,
  )
}

async function compra(id: string, valor: number, { loja = 'loja-a', reservaId = null as string | null, comFicha = 0, criado = '-1 days' } = {}) {
  await sql(
    `INSERT INTO compra (id, cliente_id, loja_id, reserva_id, valor_centavos, origem, com_ficha, criado_em)
     VALUES (?1, 'c-ana', ?2, ?3, ?4, 'CAIXA', ?5, datetime('now', ?6))`,
    id,
    loja,
    reservaId,
    valor,
    comFicha,
    criado,
  )
}

async function busca(termo: string, categoria: string, encontrou: boolean, vezes = 1) {
  for (let i = 0; i < vezes; i++) {
    await sql(`INSERT INTO busca (id, termo, categoria, encontrou) VALUES (?1, ?2, ?3, ?4)`, crypto.randomUUID(), termo, categoria, encontrou ? 1 : 0)
  }
}

describe('GET e POST /api/loja/cupons', () => {
  it('só os cupons da loja, os que valem antes dos vencidos, com o uso de cada um', async () => {
    await compra('co-1', 35991)
    await sql(`INSERT INTO uso_cupom (compra_id, cupom_id, desconto_centavos) VALUES ('co-1', 'cp-a-10', 3999)`)
    const r = await chamar(listarCupons, { url: '/api/loja/cupons', usuario: LOJISTA_A })
    expect(r.status).toBe(200)
    const ids = r.corpo.itens.map((c: { id: string }) => c.id)
    expect(ids).not.toContain('cp-shopping-20')
    expect(ids).not.toContain('cp-b-5')
    expect(ids.at(-1)).toBe('cp-a-vencido')
    expect(r.corpo.total).toBe(ids.length)
    expect(r.corpo.itens.find((c: { id: string }) => c.id === 'cp-a-10')).toMatchObject({
      titulo: '10% em calçados',
      tipo: 'PERCENTUAL',
      valor: 10,
      ativo: true,
      usos: 1,
      descontoCentavos: 3999,
    })
  })

  it('cria um cupom na loja do token, que já vale no atendimento', async () => {
    const corpo = {
      titulo: 'R$ 30 em tênis',
      tipo: 'VALOR',
      valor: 3000,
      categoriaAlvo: 'calcados',
      nivelMinimo: 'BROTO',
      limitePorCliente: 1,
      validade: '2099-12-13',
    }
    const r = await chamar(criarCupom, { metodo: 'POST', url: '/api/loja/cupons', corpo, usuario: LOJISTA_B })
    expect(r.status).toBe(201)
    expect(r.corpo).toMatchObject({ ...corpo, ativo: true, usos: 0, descontoCentavos: 0 })
    const linha = await env.DB.prepare('SELECT loja_id FROM cupom WHERE id = ?1').bind(r.corpo.id).first<{ loja_id: string }>()
    expect(linha?.loja_id).toBe('loja-b')
  })

  it('recusa validade no passado e valor fora da regra do tipo', async () => {
    const base = { titulo: 'Cupom', tipo: 'PERCENTUAL', valor: 10, nivelMinimo: 'SEMENTE', limitePorCliente: 1, validade: '2099-01-01' }
    for (const caso of [{ validade: '2020-01-01' }, { valor: 101 }, { tipo: 'BRINDE' }]) {
      const r = await chamar(criarCupom, { metodo: 'POST', url: '/api/loja/cupons', corpo: { ...base, ...caso }, usuario: LOJISTA_A })
      expect(r.status, JSON.stringify(caso)).toBe(400)
    }
  })
})

describe('GET /api/loja/relatorios', () => {
  /** Uma retirada com ficha e cupom, uma compra sem ficha e reservas de cada status. */
  async function movimento() {
    await reserva('r-retirada', 'RETIRADA')
    await compra('co-retirada', 35991, { reservaId: 'r-retirada', comFicha: 1, criado: '-2 days' })
    await sql(`INSERT INTO uso_cupom (compra_id, cupom_id, desconto_centavos) VALUES ('co-retirada', 'cp-a-10', 3999)`)
    await compra('co-balcao', 10000)
    await reserva('r-aberta', 'PENDENTE', { produto: 'p-run' })
    await reserva('r-cancelada', 'CANCELADA', { produto: 'p-run' })
    await reserva('r-expirada', 'EXPIRADA', { produto: 'p-run' })
    await reserva('r-antiga', 'RETIRADA', { produto: 'p-run', criado: '-40 days' })
    await busca('Tênis de trilha', 'calcados', false, 2)
    await busca('tênis de corrida', 'calcados', true)
    await busca('perfume amadeirado', 'perfumaria', false)
  }

  it('RF24: vendidos, buscas nas categorias da loja, ticket com e sem ficha, cupons e reservas do período', async () => {
    await movimento()
    const r = await chamar(relatorio, { url: '/api/loja/relatorios?periodo=30d', usuario: LOJISTA_A })
    expect(r.status).toBe(200)
    expect(r.corpo).toMatchObject({
      periodo: '30d',
      maisVendidos: [{ produtoId: 'p-pulse', nome: 'Tênis de corrida Pulse', quantidade: 1, valorCentavos: 39990 }],
      maisBuscados: [
        { termo: 'tênis de trilha', buscas: 2 },
        { termo: 'tênis de corrida', buscas: 1 },
      ],
      // A busca de perfume é de outra categoria: não entra na loja A (RN12).
      naoEncontrados: [{ termo: 'tênis de trilha', buscas: 2 }],
      cupons: [{ cupomId: 'cp-a-10', titulo: '10% em calçados', usos: 1, descontoCentavos: 3999 }],
      ticketMedio: { comFichaCentavos: 35991, semFichaCentavos: 10000 },
      // Só a loja A vende calçados e roupas: nada para comparar (RN13).
      comparativoCategoria: null,
      reservas: { feitas: 4, retiradas: 1, emAberto: 1, canceladas: 1, expiradas: 1 },
    })
    expect(r.corpo.picos.reduce((soma: number, p: { compras: number }) => soma + p.compras, 0)).toBe(2)
    for (const p of r.corpo.picos) {
      expect(p.diaDaSemana).toBeGreaterThanOrEqual(0)
      expect(p.diaDaSemana).toBeLessThanOrEqual(6)
      expect(p.hora).toBeGreaterThanOrEqual(0)
      expect(p.hora).toBeLessThanOrEqual(23)
    }
    // O Pulse vendeu no período; os parados são os outros ativos com estoque.
    const parados = r.corpo.parados.map((p: { produtoId: string }) => p.produtoId)
    expect(parados).not.toContain('p-pulse')
    expect(parados.length).toBeGreaterThan(0)
    expect(parados.length).toBeLessThanOrEqual(5)
  })

  it('o período muda a conta: em 90 dias entram a compra de 60 dias atrás e a reserva de 40', async () => {
    await movimento()
    const r = await chamar(relatorio, { url: '/api/loja/relatorios?periodo=90d', usuario: LOJISTA_A })
    expect(r.corpo.picos.reduce((soma: number, p: { compras: number }) => soma + p.compras, 0)).toBe(3)
    expect(r.corpo.reservas).toMatchObject({ feitas: 5, retiradas: 2 })
  })

  it('RN13: com 3 lojas ou mais na categoria, compara o ticket médio', async () => {
    await movimento()
    await sql(`UPDATE loja SET categorias = '["perfumaria","calcados"]' WHERE id = 'loja-b'`)
    await sql(`UPDATE loja SET categorias = '["alimentacao","calcados"]' WHERE id = 'restaurante-c'`)
    const r = await chamar(relatorio, { url: '/api/loja/relatorios', usuario: LOJISTA_A })
    // Loja A: (35.991 + 10.000) / 2. Calçados: as duas da loja A e a de 10 dias atrás da loja B.
    expect(r.corpo.comparativoCategoria).toEqual([
      { categoria: 'calcados', ticketMedioLojaCentavos: 22996, ticketMedioCategoriaCentavos: Math.round((35991 + 10000 + 74000) / 3) },
    ])
  })

  it('cada loja só vê o próprio movimento; período desconhecido é 400', async () => {
    await movimento()
    const b = await chamar(relatorio, { url: '/api/loja/relatorios', usuario: LOJISTA_B })
    expect(b.corpo.maisVendidos).toEqual([])
    expect(b.corpo.cupons).toEqual([])
    expect(b.corpo.naoEncontrados).toEqual([{ termo: 'perfume amadeirado', buscas: 1 }])
    const ruim = await chamar(relatorio, { url: '/api/loja/relatorios?periodo=1a', usuario: LOJISTA_A })
    expect(ruim.status).toBe(400)
  })
})
