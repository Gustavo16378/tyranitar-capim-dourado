// Conta do cliente (tela Minha conta): GET e PATCH /api/me (nome), PUT /api/me/senha, a ficha
// que a Capi anotou (GET /api/me/ficha e DELETE /api/me/ficha/{id}), PUT /api/me/consentimento
// (RF13, RNF06, TA21) e DELETE /api/me (exclusão da conta, LGPD).
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { gerarHashSenha } from '../../functions/_lib/auth/senha'
import { onRequestPost as login } from '../../functions/api/auth/login'
import { onRequestGet as atendimento } from '../../functions/api/loja/atendimento/[qr]'
import { onRequestPut as consentimento } from '../../functions/api/me/consentimento'
import { onRequestDelete as apagarInteresse } from '../../functions/api/me/ficha/[id]'
import { onRequestGet as ficha } from '../../functions/api/me/ficha/index'
import {
  onRequestDelete as excluir,
  onRequestGet as conta,
  onRequestPatch as mudarNome,
} from '../../functions/api/me/index'
import { onRequestPut as trocarSenha } from '../../functions/api/me/senha'
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

describe('PATCH /api/me', () => {
  const renomear = (corpo: unknown, usuario = ANA) => chamar(mudarNome, { metodo: 'PATCH', url: '/api/me', corpo, usuario })

  it('TA37: troca o nome, sem os espaços a mais, e responde a conta atualizada', async () => {
    const r = await renomear({ nome: '  Ana   Souza  Lima ' })
    expect(r.status).toBe(200)
    expect(r.corpo).toMatchObject({ id: 'c-ana', nome: 'Ana Souza Lima', email: 'ana@teste.test' })
    expect(await um("SELECT nome FROM usuario WHERE id = 'c-ana'")).toEqual({ nome: 'Ana Souza Lima' })
  })

  it('nome vazio, curto, longo ou fora do formato: 400 e nada muda', async () => {
    for (const corpo of [{}, { nome: '' }, { nome: ' a ' }, { nome: 'x'.repeat(101) }, { nome: 42 }]) {
      expect((await renomear(corpo)).status).toBe(400)
    }
    expect(await um("SELECT nome FROM usuario WHERE id = 'c-ana'")).toEqual({ nome: 'Ana Souza' })
  })

  it('sem login 401; lojista 403; conta excluída 401', async () => {
    expect((await chamar(mudarNome, { metodo: 'PATCH', url: '/api/me', corpo: { nome: 'Outro' } })).status).toBe(401)
    expect((await renomear({ nome: 'Outro' }, LOJISTA_A)).status).toBe(403)
    expect(await um("SELECT nome FROM usuario WHERE id = 'l-a'")).toEqual({ nome: 'Equipe da Loja A' })
    await chamar(excluir, { metodo: 'DELETE', url: '/api/me', usuario: ANA })
    expect((await renomear({ nome: 'Outro' })).status).toBe(401)
  })
})

describe('PUT /api/me/senha', () => {
  const SENHA = 'senha-antiga-123'
  // Poucas iterações: o teste confere a troca, não o custo do hash (a verificação lê do hash).
  const comSenha = async () => {
    await env.DB.prepare("UPDATE usuario SET senha_hash = ?1 WHERE id = 'c-ana'")
      .bind(await gerarHashSenha(SENHA, 1000))
      .run()
  }
  const trocar = (corpo: unknown, extra: Partial<Parameters<typeof chamar>[1]> = {}) =>
    chamar(trocarSenha, { metodo: 'PUT', url: '/api/me/senha', corpo, usuario: ANA, ...extra })
  const entrar = (senha: string) =>
    chamar(login, { metodo: 'POST', url: '/api/auth/login', corpo: { email: 'ana@teste.test', senha } })
  const hash = async () => (await um<{ senha_hash: string }>("SELECT senha_hash FROM usuario WHERE id = 'c-ana'")).senha_hash

  it('TA37: com a senha atual certa, troca: a nova entra e a antiga não', async () => {
    await comSenha()
    const r = await trocar({ senhaAtual: SENHA, novaSenha: 'senha-nova-456' })
    expect(r.status).toBe(204)
    expect(r.corpo).toBeNull()
    expect((await entrar('senha-nova-456')).status).toBe(200)
    expect((await entrar(SENHA)).status).toBe(401)
  })

  it('senha atual errada: 400 (a sessão continua) e a senha não muda', async () => {
    await comSenha()
    const antes = await hash()
    const r = await trocar({ senhaAtual: 'nao-e-essa', novaSenha: 'senha-nova-456' })
    expect(r.status).toBe(400)
    expect(r.corpo).toMatchObject({ erro: 'DADOS_INVALIDOS', mensagem: expect.stringContaining('senha atual') })
    expect(await hash()).toBe(antes)
  })

  it('senha nova curta, igual à atual ou campo faltando: 400', async () => {
    await comSenha()
    const antes = await hash()
    for (const corpo of [
      { senhaAtual: SENHA, novaSenha: 'curta' },
      { senhaAtual: SENHA, novaSenha: SENHA },
      { senhaAtual: SENHA },
      { novaSenha: 'senha-nova-456' },
    ]) {
      expect((await trocar(corpo)).status).toBe(400)
    }
    expect(await hash()).toBe(antes)
  })

  it('com a demo ligada, a conta de demonstração não troca de senha', async () => {
    await comSenha()
    await env.DB.prepare("UPDATE usuario SET email = 'ana.souza@demo.test' WHERE id = 'c-ana'").run()
    const antes = await hash()
    const r = await trocar({ senhaAtual: SENHA, novaSenha: 'senha-nova-456' }, { ambiente: { DEMO: '1' } })
    expect(r.status).toBe(403)
    expect(await hash()).toBe(antes)
  })

  it('sem login 401; lojista 403', async () => {
    const corpo = { senhaAtual: SENHA, novaSenha: 'senha-nova-456' }
    expect((await trocar(corpo, { usuario: undefined })).status).toBe(401)
    expect((await trocar(corpo, { usuario: LOJISTA_A })).status).toBe(403)
  })
})

describe('GET /api/me/ficha e DELETE /api/me/ficha/{id}', () => {
  const lerFicha = (usuario = ANA) => chamar(ficha, { url: '/api/me/ficha', usuario })
  const apagar = (id: string, usuario = ANA) =>
    chamar(apagarInteresse, { metodo: 'DELETE', url: `/api/me/ficha/${id}`, params: { id }, usuario })
  const fichaNoBalcao = async () =>
    (await chamar(atendimento, { url: '/api/loja/atendimento/q-ana', params: { qr: 'q-ana' }, usuario: LOJISTA_A })).corpo
      .ficha

  it('o que a Capi anotou, cada interesse com um id para apagar', async () => {
    const r = await lerFicha()
    expect(r.status).toBe(200)
    expect(r.corpo).toMatchObject({
      compartilharFicha: true,
      interesses: [
        { id: expect.any(String), categoria: 'calcados', detalhe: 'Tênis de corrida, número 42, até R$ 400' },
        { id: expect.any(String), categoria: 'roupas', detalhe: 'Camisetas dry-fit' },
      ],
      atualizadaEm: expect.stringMatching(/^\d{4}-\d\d-\d\dT/),
    })
    expect(new Set(r.corpo.interesses.map((i: { id: string }) => i.id)).size).toBe(2)
    // Sem consentimento, nada anotado.
    expect((await lerFicha(BRUNO)).corpo).toEqual({ compartilharFicha: false, interesses: [], atualizadaEm: null })
  })

  it('TA38: apagar um interesse tira ele da ficha e do que a loja vê; o outro fica com o mesmo id', async () => {
    const [tenis, camisetas] = (await lerFicha()).corpo.interesses
    const r = await apagar(tenis.id)
    expect(r.status).toBe(200)
    expect(r.corpo.interesses).toEqual([camisetas])
    expect(await um("SELECT interesses FROM ficha WHERE cliente_id = 'c-ana'")).toEqual({
      interesses: JSON.stringify([{ categoria: 'roupas', detalhe: 'Camisetas dry-fit' }]),
    })
    expect(await fichaNoBalcao()).toEqual(['Camisetas dry-fit'])
  })

  it('interesse que não está na ficha: 404; outro cliente não apaga o da Ana', async () => {
    const [tenis] = (await lerFicha()).corpo.interesses
    expect((await apagar('nao-existe')).status).toBe(404)
    expect((await apagar(tenis.id, BRUNO)).status).toBe(404)
    expect((await lerFicha()).corpo.interesses).toHaveLength(2)
    // Apagado uma vez, a segunda é 404.
    expect((await apagar(tenis.id)).status).toBe(200)
    expect((await apagar(tenis.id)).status).toBe(404)
  })

  it('sem login 401; lojista 403', async () => {
    expect((await chamar(ficha, { url: '/api/me/ficha' })).status).toBe(401)
    expect((await lerFicha(LOJISTA_A)).status).toBe(403)
    expect((await apagar('x', LOJISTA_A)).status).toBe(403)
  })
})
