// Conta do cliente (tela Minha conta): GET /api/me, PUT /api/me/consentimento (RF13, RNF06,
// TA21) e DELETE /api/me (exclusão da conta, LGPD).
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { onRequestPost as login } from '../../functions/api/auth/login'
import { onRequestPut as consentimento } from '../../functions/api/me/consentimento'
import { onRequestDelete as excluir, onRequestGet as conta } from '../../functions/api/me/index'
import { onRequestPost as reservar } from '../../functions/api/reservas/index'
import { ANA, BRUNO, chamar, LOJISTA_A } from '../workers/rotas'

const um = async <T>(sql: string, ...valores: unknown[]) =>
  (await env.DB.prepare(sql)
    .bind(...valores)
    .first<T>())!

const mudarConsentimento = (corpo: unknown, usuario = ANA) =>
  chamar(consentimento, { metodo: 'PUT', url: '/api/me/consentimento', corpo, usuario })

describe('GET /api/me', () => {
  it('a conta do cliente: nome, e-mail, nível, pontos e a ficha compartilhada', async () => {
    const r = await chamar(conta, { url: '/api/me', usuario: ANA })
    expect(r.status).toBe(200)
    expect(r.corpo).toEqual({
      id: 'c-ana',
      nome: 'Ana Souza',
      email: 'ana@teste.test',
      nivel: 'CAPIM',
      pontos: 2140,
      compartilharFicha: true,
    })
    expect((await chamar(conta, { url: '/api/me', usuario: BRUNO })).corpo).toMatchObject({
      nivel: 'SEMENTE',
      compartilharFicha: false,
    })
  })

  it('sem login 401; lojista 403', async () => {
    expect((await chamar(conta, { url: '/api/me' })).status).toBe(401)
    expect((await chamar(conta, { url: '/api/me', usuario: LOJISTA_A })).status).toBe(403)
  })
})

describe('PUT /api/me/consentimento', () => {
  it('TA21: desligar apaga a ficha na hora; ligar de novo começa com ela vazia', async () => {
    const desligado = await mudarConsentimento({ compartilharFicha: false })
    expect(desligado.status).toBe(200)
    expect(desligado.corpo).toMatchObject({ compartilharFicha: false })
    expect(await um("SELECT consentimento_ficha FROM usuario WHERE id = 'c-ana'")).toEqual({ consentimento_ficha: 0 })
    expect(await um("SELECT count(*) AS n FROM ficha WHERE cliente_id = 'c-ana'")).toEqual({ n: 0 })

    const ligado = await mudarConsentimento({ compartilharFicha: true })
    expect(ligado.corpo).toMatchObject({ compartilharFicha: true })
    expect(await um("SELECT count(*) AS n FROM ficha WHERE cliente_id = 'c-ana'")).toEqual({ n: 0 })
  })

  it('corpo sem true ou false: 400 e nada muda', async () => {
    const r = await mudarConsentimento({ compartilharFicha: 'nao' })
    expect(r.status).toBe(400)
    expect(await um("SELECT count(*) AS n FROM ficha WHERE cliente_id = 'c-ana'")).toEqual({ n: 1 })
  })
})

describe('DELETE /api/me', () => {
  it('apaga os dados pessoais, cancela as reservas abertas e mantém as compras das lojas', async () => {
    const reserva = await chamar(reservar, {
      metodo: 'POST',
      url: '/api/reservas',
      corpo: { produtoId: 'p-run', quantidade: 2, formaPagamento: 'NA_LOJA' },
      usuario: ANA,
    })
    expect(reserva.status).toBe(201)
    expect(await um("SELECT estoque FROM produto WHERE id = 'p-run'")).toEqual({ estoque: 3 })
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO mensagem (id, cliente_id, papel, conteudo) VALUES ('m-1', 'c-ana', 'CLIENTE', 'Tem tênis 42?')",
      ),
      env.DB.prepare("INSERT INTO favorito (cliente_id, produto_id) VALUES ('c-ana', 'p-pulse')"),
      env.DB.prepare("INSERT INTO busca (id, cliente_id, termo, encontrou) VALUES ('b-1', 'c-ana', 'tênis', 1)"),
    ])

    const r = await chamar(excluir, { metodo: 'DELETE', url: '/api/me', usuario: ANA })
    expect(r.status).toBe(204)

    expect(
      await um("SELECT nome, email, qr_token, pontos, consentimento_ficha FROM usuario WHERE id = 'c-ana'"),
    ).toEqual({
      nome: 'Conta excluída',
      email: 'c-ana@conta-excluida.invalid',
      qr_token: null,
      pontos: 0,
      consentimento_ficha: 0,
    })
    expect(
      await um(
        `SELECT (SELECT count(*) FROM ficha WHERE cliente_id = 'c-ana') AS ficha,
                (SELECT count(*) FROM mensagem WHERE cliente_id = 'c-ana') AS mensagens,
                (SELECT count(*) FROM favorito WHERE cliente_id = 'c-ana') AS favoritos,
                (SELECT count(*) FROM busca WHERE cliente_id = 'c-ana') AS buscas,
                (SELECT count(*) FROM busca WHERE id = 'b-1') AS buscaAnonima,
                (SELECT count(*) FROM compra WHERE cliente_id = 'c-ana') AS compras`,
      ),
    ).toEqual({ ficha: 0, mensagens: 0, favoritos: 0, buscas: 0, buscaAnonima: 1, compras: 2 })
    // A reserva aberta foi cancelada e as duas unidades voltaram ao estoque (RN03).
    expect(await um('SELECT status FROM reserva WHERE id = ?1', reserva.corpo.id)).toEqual({ status: 'CANCELADA' })
    expect(await um("SELECT estoque FROM produto WHERE id = 'p-run'")).toEqual({ estoque: 5 })
  })

  it('depois de excluída, a conta não entra mais e o token antigo não vale', async () => {
    await chamar(excluir, { metodo: 'DELETE', url: '/api/me', usuario: ANA })
    const entrar = await chamar(login, {
      metodo: 'POST',
      url: '/api/auth/login',
      corpo: { email: 'ana@teste.test', senha: 'qualquer-senha' },
    })
    expect(entrar.status).toBe(401)
    expect((await chamar(conta, { url: '/api/me', usuario: ANA })).status).toBe(401)
    expect((await chamar(excluir, { metodo: 'DELETE', url: '/api/me', usuario: ANA })).status).toBe(401)
  })

  it('com a demo ligada, a conta de demonstração não pode ser excluída', async () => {
    await env.DB.prepare("UPDATE usuario SET email = 'ana.souza@demo.test' WHERE id = 'c-ana'").run()
    const r = await chamar(excluir, { metodo: 'DELETE', url: '/api/me', usuario: ANA, ambiente: { DEMO: '1' } })
    expect(r.status).toBe(403)
    expect(await um("SELECT email FROM usuario WHERE id = 'c-ana'")).toEqual({ email: 'ana.souza@demo.test' })
  })

  it('lojista não exclui pela rota do cliente', async () => {
    expect((await chamar(excluir, { metodo: 'DELETE', url: '/api/me', usuario: LOJISTA_A })).status).toBe(403)
  })
})
