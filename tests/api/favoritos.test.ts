// O coração de salvar (TA42): PUT e DELETE /api/me/favoritos/{produtoId}, que mudam o que
// GET /api/me/favoritos lista ("Salvos para provar").
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { onRequestDelete as tirar, onRequestPut as salvar } from '../../functions/api/me/favoritos/[produtoId]'
import { onRequestGet as listar } from '../../functions/api/me/favoritos/index'
import { ANA, BRUNO, chamar, LOJISTA_A } from '../workers/rotas'
import type { UsuarioSessao } from '../../functions/_lib/auth/jwt'

/** null: sem login. */
const pedido = (metodo: 'PUT' | 'DELETE', produtoId: string, usuario: UsuarioSessao | null = ANA) =>
  chamar(metodo === 'PUT' ? salvar : tirar, {
    metodo,
    url: `/api/me/favoritos/${produtoId}`,
    params: { produtoId },
    usuario: usuario ?? undefined,
  })

const salvos = async (usuario = ANA) =>
  ((await chamar(listar, { url: '/api/me/favoritos', usuario })).corpo.itens as { id: string }[]).map((p) => p.id)

describe('PUT /api/me/favoritos/{produtoId}', () => {
  it('TA42: salva e o produto aparece nos salvos, o mais recente primeiro', async () => {
    await env.DB.prepare(
      "INSERT INTO favorito (cliente_id, produto_id, criado_em) VALUES ('c-ana', 'p-perfume', datetime('now', '-1 days'))",
    ).run()
    const r = await pedido('PUT', 'p-pulse')
    expect(r.status).toBe(204)
    expect(r.texto).toBe('')
    expect(await salvos()).toEqual(['p-pulse', 'p-perfume'])
  })

  it('salvar de novo responde 204 e não duplica nem muda a data', async () => {
    await env.DB.prepare(
      "INSERT INTO favorito (cliente_id, produto_id, criado_em) VALUES ('c-ana', 'p-pulse', '2026-01-01 10:00:00')",
    ).run()
    expect((await pedido('PUT', 'p-pulse')).status).toBe(204)
    const linhas = await env.DB.prepare("SELECT criado_em FROM favorito WHERE cliente_id = 'c-ana'").all()
    expect(linhas.results).toEqual([{ criado_em: '2026-01-01 10:00:00' }])
  })

  it('produto inativo ou que não existe: 404, e nada é salvo', async () => {
    const inativo = await pedido('PUT', 'p-inativo')
    expect(inativo.status).toBe(404)
    expect(inativo.corpo).toMatchObject({ erro: 'NAO_ENCONTRADO' })
    expect((await pedido('PUT', 'nao-existe')).status).toBe(404)
    const { total } = (await env.DB.prepare('SELECT count(*) AS total FROM favorito').first<{ total: number }>())!
    expect(total).toBe(0)
  })
})

describe('DELETE /api/me/favoritos/{produtoId}', () => {
  it('tira dos salvos só do cliente logado; tirar de novo também é 204', async () => {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO favorito (cliente_id, produto_id) VALUES ('c-ana', 'p-pulse')"),
      env.DB.prepare("INSERT INTO favorito (cliente_id, produto_id) VALUES ('c-bruno', 'p-pulse')"),
    ])
    expect((await pedido('DELETE', 'p-pulse')).status).toBe(204)
    expect(await salvos()).toEqual([])
    expect(await salvos(BRUNO)).toEqual(['p-pulse'])
    expect((await pedido('DELETE', 'p-pulse')).status).toBe(204)
    expect((await pedido('DELETE', 'nunca-salvo')).status).toBe(204)
  })
})

describe('perfis', () => {
  it('sem login 401; lojista 403, nas duas', async () => {
    for (const metodo of ['PUT', 'DELETE'] as const) {
      expect((await pedido(metodo, 'p-pulse', null)).status).toBe(401)
      expect((await pedido(metodo, 'p-pulse', LOJISTA_A)).status).toBe(403)
    }
    const { total } = (await env.DB.prepare('SELECT count(*) AS total FROM favorito').first<{ total: number }>())!
    expect(total).toBe(0)
  })
})
