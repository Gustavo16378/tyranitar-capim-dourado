// Rotas do app do cliente registradas pela fase-3 no docs/api.md (TA04, TA11 a TA13, TA17).
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { lerToken } from '../../functions/_lib/auth/jwt'
import { onRequestPost as cadastro } from '../../functions/api/auth/cadastro'
import { onRequestGet as contas, onRequestPost as demo } from '../../functions/api/auth/demo'
import { onRequestGet as carteira } from '../../functions/api/me/carteira'
import { onRequestGet as favoritos } from '../../functions/api/me/favoritos/index'
import { onRequestPatch as mudarNaLoja } from '../../functions/api/loja/reservas/[id]'
import { onRequestGet as reservasDaLoja } from '../../functions/api/loja/reservas/index'
import { onRequestPatch as cancelar } from '../../functions/api/reservas/[id]/cancelar'
import { onRequestGet as lerReserva } from '../../functions/api/reservas/[id]/index'
import { onRequestPost as pagar } from '../../functions/api/reservas/[id]/pagamento'
import { onRequestPost as reservar } from '../../functions/api/reservas/index'
import { onRequestGet as cuponsDoProduto } from '../../functions/api/produtos/[id]/cupons'
import { onRequestGet as notificacoes } from '../../functions/api/me/notificacoes/index'
import { onRequestPost as marcarLidas } from '../../functions/api/me/notificacoes/lidas'
import { onRequestGet as atendimento } from '../../functions/api/loja/atendimento/[qr]'
import { ANA, BRUNO, chamar, LOJISTA_A } from '../workers/rotas'

const um = async <T>(sql: string, ...valores: unknown[]) => (await env.DB.prepare(sql).bind(...valores).first<T>())!
const HORA = 60 * 60 * 1000

const novaReserva = (corpo: Record<string, unknown>, usuario = ANA) =>
  chamar(reservar, { metodo: 'POST', url: '/api/reservas', corpo, usuario })

describe('contas de demonstração: GET e POST /api/auth/demo', () => {
  const DEMO = { DEMO: '1' }
  const entrarComo = (corpo?: unknown) => chamar(demo, { metodo: 'POST', url: '/api/auth/demo', corpo, ambiente: DEMO })

  /** As três contas do seed (scripts/gerar-seed.mjs), nos usuários de tests/seed.sql. */
  async function contasDoSeed() {
    await env.DB.batch([
      env.DB.prepare("UPDATE usuario SET email = 'ana.souza@demo.test' WHERE id = 'c-ana'"),
      env.DB.prepare("UPDATE usuario SET email = 'lojista.loja-pc01a@demo.test' WHERE id = 'l-a'"),
      env.DB.prepare("UPDATE usuario SET email = 'admin@demo.test' WHERE id = 'admin'"),
    ])
  }

  it('desligadas (sem DEMO=1) respondem 404', async () => {
    await contasDoSeed()
    expect((await chamar(demo, { metodo: 'POST', url: '/api/auth/demo', corpo: { perfil: 'CLIENTE' } })).status).toBe(404)
    expect((await chamar(contas, { url: '/api/auth/demo' })).status).toBe(404)
  })

  it('com DEMO=1, lista as três contas, uma por perfil', async () => {
    await contasDoSeed()
    const r = await chamar(contas, { url: '/api/auth/demo', ambiente: DEMO })
    expect(r.corpo).toEqual({
      contas: [
        { perfil: 'CLIENTE', nome: 'Ana Souza', loja: null },
        { perfil: 'LOJISTA', nome: 'Equipe da Loja A', loja: 'Loja A' },
        { perfil: 'ADMIN_SHOPPING', nome: 'Administração', loja: null },
      ],
    })
  })

  it('entra com o perfil pedido; sem corpo, como a Ana', async () => {
    await contasDoSeed()
    const ana = await chamar(demo, { metodo: 'POST', url: '/api/auth/demo', ambiente: DEMO })
    expect(ana.corpo.usuario).toEqual({ id: 'c-ana', nome: 'Ana Souza', perfil: 'CLIENTE', lojaId: null })
    expect((await lerToken(ana.corpo.token, env.JWT_SECRET)).perfil).toBe('CLIENTE')

    const lojista = await entrarComo({ perfil: 'LOJISTA' })
    expect(lojista.corpo.usuario).toEqual({ id: 'l-a', nome: 'Equipe da Loja A', perfil: 'LOJISTA', lojaId: 'loja-a' })
    expect(await lerToken(lojista.corpo.token, env.JWT_SECRET)).toMatchObject({ perfil: 'LOJISTA', lojaId: 'loja-a' })

    const admin = await entrarComo({ perfil: 'ADMIN_SHOPPING' })
    expect((await lerToken(admin.corpo.token, env.JWT_SECRET)).perfil).toBe('ADMIN_SHOPPING')
  })

  it('o lojista da demonstração é o que o seed gravou em configuracao, se houver', async () => {
    await contasDoSeed()
    await env.DB.prepare("UPDATE usuario SET email = 'lojista.loja-x@demo.test' WHERE id = 'l-b'").run()
    await env.DB.prepare(
      "INSERT INTO configuracao (chave, valor) VALUES ('conta_demo_lojista', '\"lojista.loja-x@demo.test\"')",
    ).run()
    try {
      const r = await chamar(contas, { url: '/api/auth/demo', ambiente: DEMO })
      expect(r.corpo.contas[1]).toEqual({ perfil: 'LOJISTA', nome: 'Equipe da Loja B', loja: 'Loja B' })
      const lojista = await entrarComo({ perfil: 'LOJISTA' })
      expect(lojista.corpo.usuario).toMatchObject({ id: 'l-b', perfil: 'LOJISTA', lojaId: 'loja-b' })
    } finally {
      // A configuração não é apagada entre os testes (tests/workers/preparar-banco.ts).
      await env.DB.prepare("DELETE FROM configuracao WHERE chave = 'conta_demo_lojista'").run()
    }
  })

  it('só aceita os três perfis e só os usuários do seed, cada um com o perfil dele', async () => {
    expect((await entrarComo({ perfil: 'ROOT' })).status).toBe(400)
    // Sem as contas do seed no banco (os e-mails de tests/seed.sql são outros), nada entra.
    expect((await entrarComo({ perfil: 'LOJISTA' })).status).toBe(404)
    // O e-mail da conta de lojista com perfil de cliente não vira lojista.
    await env.DB.prepare("UPDATE usuario SET email = 'lojista.loja-pc01a@demo.test' WHERE id = 'c-bruno'").run()
    expect((await entrarComo({ perfil: 'LOJISTA' })).status).toBe(404)
    expect((await chamar(contas, { url: '/api/auth/demo', ambiente: DEMO })).corpo).toEqual({ contas: [] })
  })
})

describe('POST /api/auth/cadastro', () => {
  const novaConta = (corpo: Record<string, unknown>) => chamar(cadastro, { metodo: 'POST', url: '/api/auth/cadastro', corpo })

  it('cria o cliente já logado, com 0 pontos e nível Semente, sem consentimento por padrão', async () => {
    const r = await novaConta({ nome: 'Carla Dias', email: 'Carla@Exemplo.com', senha: 'senha-segura-1' })
    expect(r.status).toBe(201)
    expect(r.corpo.usuario).toMatchObject({ nome: 'Carla Dias', perfil: 'CLIENTE', lojaId: null })
    const { id } = await lerToken(r.corpo.token, env.JWT_SECRET)
    expect(await um('SELECT email, pontos, consentimento_ficha FROM usuario WHERE id = ?1', id)).toEqual({
      email: 'carla@exemplo.com',
      pontos: 0,
      consentimento_ficha: 0,
    })
    const c = await chamar(carteira, { url: '/api/me/carteira', usuario: { id, nome: 'Carla Dias', perfil: 'CLIENTE', lojaId: null } })
    expect(c.corpo).toMatchObject({ pontos: 0, nivel: 'SEMENTE', reservasAtivas: [] })
  })

  it('com a caixa marcada, grava o consentimento da ficha; e-mail repetido dá 409', async () => {
    const r = await novaConta({ nome: 'Davi Reis', email: 'davi@exemplo.com', senha: 'senha-segura-2', consentimentoFicha: true })
    const { id } = await lerToken(r.corpo.token, env.JWT_SECRET)
    expect(await um('SELECT consentimento_ficha FROM usuario WHERE id = ?1', id)).toEqual({ consentimento_ficha: 1 })
    const repetido = await novaConta({ nome: 'Outro Davi', email: 'DAVI@exemplo.com', senha: 'senha-segura-3' })
    expect(repetido).toMatchObject({ status: 409, corpo: { erro: 'EMAIL_EM_USO' } })
  })

  it('consentimento que não é sim ou não dá 400', async () => {
    const r = await novaConta({ nome: 'Eva Lima', email: 'eva@exemplo.com', senha: 'senha-segura-4', consentimentoFicha: 'sim' })
    expect(r).toMatchObject({ status: 400, corpo: { erro: 'DADOS_INVALIDOS' } })
  })
})

describe('reservas do cliente', () => {
  it('TA11: pagar na loja: 201, estoque menos 1, expira em 4 h, sem Pix', async () => {
    const antes = Date.now()
    const r = await novaReserva({ produtoId: 'p-pulse', quantidade: 1, formaPagamento: 'NA_LOJA' })
    expect(r.status).toBe(201)
    expect(r.corpo).toMatchObject({ status: 'PENDENTE', formaPagamento: 'NA_LOJA', pago: false, precoCentavos: 39990 })
    expect(r.corpo.pix).toBeUndefined()
    expect(Math.abs(Date.parse(r.corpo.expiraEm) - antes - 4 * HORA)).toBeLessThan(5000)
    expect(await um("SELECT estoque FROM produto WHERE id = 'p-pulse'")).toEqual({ estoque: 1 })
  })

  it('TA12: Pix: vem o copia e cola; pagar deixa paga, ainda PENDENTE; confirmada, vale 48 h; pagar de novo é 409', async () => {
    const r = await novaReserva({ produtoId: 'p-run', quantidade: 2, formaPagamento: 'PIX' })
    expect(r.corpo).toMatchObject({ formaPagamento: 'PIX', pago: false, precoCentavos: 69980, pix: { simulado: true } })
    expect(r.corpo.pix.copiaECola).toMatch(/^000201/)
    const pago = await chamar(pagar, { metodo: 'POST', url: `/api/reservas/${r.corpo.id}/pagamento`, params: { id: r.corpo.id }, usuario: ANA })
    expect(pago.status).toBe(200)
    // Pendente, o prazo é o da loja responder; o de retirar só conta da confirmação.
    expect(pago.corpo).toMatchObject({ status: 'PENDENTE', pago: true, expiraEm: r.corpo.expiraEm })
    const antes = Date.now()
    const confirmar = { metodo: 'PATCH', url: `/api/loja/reservas/${r.corpo.id}`, params: { id: r.corpo.id }, corpo: { status: 'CONFIRMADA' }, usuario: LOJISTA_A }
    const confirmada = await chamar(mudarNaLoja, confirmar)
    expect(Math.abs(Date.parse(confirmada.corpo.expiraEm) - antes - 48 * HORA)).toBeLessThan(5000)
    const deNovo = await chamar(pagar, { metodo: 'POST', url: `/api/reservas/${r.corpo.id}/pagamento`, params: { id: r.corpo.id }, usuario: ANA })
    expect(deNovo.status).toBe(409)
    expect(deNovo.corpo.erro).toBe('TRANSICAO_INVALIDA')
  })

  it('pagar reserva de pagar na loja é 409', async () => {
    const r = await novaReserva({ produtoId: 'p-pulse', formaPagamento: 'NA_LOJA' })
    const pago = await chamar(pagar, { metodo: 'POST', url: `/api/reservas/${r.corpo.id}/pagamento`, params: { id: r.corpo.id }, usuario: ANA })
    expect(pago.status).toBe(409)
  })

  it('TA13: sem estoque é 409; produto inativo é 404; dados ruins são 400', async () => {
    expect((await novaReserva({ produtoId: 'p-hidratante', formaPagamento: 'PIX' })).status).toBe(409)
    expect((await novaReserva({ produtoId: 'p-inativo', formaPagamento: 'PIX' })).status).toBe(404)
    expect((await novaReserva({ produtoId: 'p-pulse', formaPagamento: 'CARTAO' })).status).toBe(400)
    expect((await novaReserva({ produtoId: 'p-pulse', quantidade: 9, formaPagamento: 'PIX' })).status).toBe(400)
  })

  it('TA04/TA05: sem token é 401; lojista criando reserva é 403', async () => {
    expect((await chamar(reservar, { metodo: 'POST', url: '/api/reservas', corpo: { produtoId: 'p-pulse', formaPagamento: 'PIX' } })).status).toBe(401)
    expect((await novaReserva({ produtoId: 'p-pulse', formaPagamento: 'PIX' }, LOJISTA_A)).status).toBe(403)
  })

  it('GET /api/reservas/{id}: o dono vê com o produto; outro cliente recebe o mesmo 404 de uma que não existe', async () => {
    const r = await novaReserva({ produtoId: 'p-perfume', formaPagamento: 'PIX' })
    const dono = await chamar(lerReserva, { url: `/api/reservas/${r.corpo.id}`, params: { id: r.corpo.id }, usuario: ANA })
    expect(dono.status).toBe(200)
    expect(dono.corpo).toMatchObject({
      id: r.corpo.id,
      pix: { simulado: true },
      produto: { id: 'p-perfume', nome: 'Perfume Cerrado 100 ml', loja: { id: 'loja-b', piso: 1, mapaId: 'mapa-loja-b' } },
    })
    const outro = await chamar(lerReserva, { url: `/api/reservas/${r.corpo.id}`, params: { id: r.corpo.id }, usuario: BRUNO })
    const inexistente = await chamar(lerReserva, { url: '/api/reservas/nao-existe', params: { id: 'nao-existe' }, usuario: BRUNO })
    expect(outro).toEqual(inexistente)
    expect(outro.status).toBe(404)
    const lojista = await chamar(lerReserva, { url: `/api/reservas/${r.corpo.id}`, params: { id: r.corpo.id }, usuario: LOJISTA_A })
    expect(lojista.status).toBe(403)
  })

  it('reserva vencida vem EXPIRADA na leitura e o estoque volta', async () => {
    const r = await novaReserva({ produtoId: 'p-pulse', formaPagamento: 'NA_LOJA' })
    await env.DB.prepare("UPDATE reserva SET expira_em = datetime('now', '-1 minutes') WHERE id = ?1").bind(r.corpo.id).run()
    const lida = await chamar(lerReserva, { url: `/api/reservas/${r.corpo.id}`, params: { id: r.corpo.id }, usuario: ANA })
    expect(lida.corpo.status).toBe('EXPIRADA')
    expect(await um("SELECT estoque FROM produto WHERE id = 'p-pulse'")).toEqual({ estoque: 2 })
  })
})

describe('PATCH /api/reservas/{id}/cancelar: o cliente cancela a própria reserva (TA40)', () => {
  /** Com null, sem token. */
  const cancelarComo = (id: string, usuario: typeof ANA | null = ANA) =>
    chamar(cancelar, { metodo: 'PATCH', url: `/api/reservas/${id}/cancelar`, params: { id }, usuario: usuario ?? undefined })
  const estoque = async (produtoId: string) =>
    (await um<{ estoque: number }>('SELECT estoque FROM produto WHERE id = ?1', produtoId)).estoque
  const statusNoBanco = async (id: string) => (await um<{ status: string }>('SELECT status FROM reserva WHERE id = ?1', id)).status

  it('o dono cancela: CANCELADA, o estoque volta na hora e a reserva sai da carteira; sem Pix, sem estorno', async () => {
    const r = await novaReserva({ produtoId: 'p-run', quantidade: 2, formaPagamento: 'NA_LOJA' })
    expect(await estoque('p-run')).toBe(3)
    const cancelada = await cancelarComo(r.corpo.id)
    expect(cancelada.status).toBe(200)
    expect(cancelada.corpo).toMatchObject({ id: r.corpo.id, status: 'CANCELADA', pago: false, estornoSolicitado: false })
    expect(await estoque('p-run')).toBe(5)
    const c = await chamar(carteira, { url: '/api/me/carteira', usuario: ANA })
    expect(c.corpo.reservasAtivas.map((a: { id: string }) => a.id)).not.toContain(r.corpo.id)
  })

  it('paga por Pix e já separada: cancela, pede o estorno, e a loja vê a reserva cancelada', async () => {
    const r = await novaReserva({ produtoId: 'p-camiseta', formaPagamento: 'PIX' })
    const id = r.corpo.id
    await chamar(pagar, { metodo: 'POST', url: `/api/reservas/${id}/pagamento`, params: { id }, usuario: ANA })
    const confirmar = { metodo: 'PATCH', url: `/api/loja/reservas/${id}`, params: { id }, corpo: { status: 'CONFIRMADA' }, usuario: LOJISTA_A }
    expect((await chamar(mudarNaLoja, confirmar)).status).toBe(200)
    const separar = { ...confirmar, corpo: { status: 'SEPARADA' } }
    expect((await chamar(mudarNaLoja, separar)).status).toBe(200)
    expect(await estoque('p-camiseta')).toBe(9)

    const cancelada = await cancelarComo(id)
    expect(cancelada.status).toBe(200)
    expect(cancelada.corpo).toMatchObject({ status: 'CANCELADA', pago: true, estornoSolicitado: true })
    expect(await estoque('p-camiseta')).toBe(10)
    const lida = await chamar(lerReserva, { url: `/api/reservas/${id}`, params: { id }, usuario: ANA })
    expect(lida.corpo).toMatchObject({ status: 'CANCELADA', estornoSolicitado: true, produto: { id: 'p-camiseta' } })

    const loja = await chamar(reservasDaLoja, { url: '/api/loja/reservas?status=CANCELADA', usuario: LOJISTA_A })
    expect(loja.corpo.itens).toContainEqual(
      expect.objectContaining({ id, status: 'CANCELADA', pago: true, estornoSolicitado: true }),
    )
  })

  it('reserva de outro cliente é 404, como uma que não existe, e nada muda; lojista é 403; sem token, 401', async () => {
    const r = await novaReserva({ produtoId: 'p-pulse', formaPagamento: 'NA_LOJA' })
    const deOutro = await cancelarComo(r.corpo.id, BRUNO)
    expect(deOutro).toMatchObject({ status: 404, corpo: { erro: 'NAO_ENCONTRADO' } })
    expect((await cancelarComo('nao-existe')).corpo).toEqual(deOutro.corpo)
    expect((await cancelarComo(r.corpo.id, LOJISTA_A)).status).toBe(403)
    expect((await cancelarComo(r.corpo.id, null)).status).toBe(401)
    expect(await statusNoBanco(r.corpo.id)).toBe('PENDENTE')
    expect(await estoque('p-pulse')).toBe(1)
  })

  it('já retirada é 409 e o estoque não volta; cancelar de novo e cancelar a expirada também são 409', async () => {
    const retirada = await novaReserva({ produtoId: 'p-jaqueta', formaPagamento: 'NA_LOJA' })
    await env.DB.prepare("UPDATE reserva SET status = 'RETIRADA' WHERE id = ?1").bind(retirada.corpo.id).run()
    const recusada = await cancelarComo(retirada.corpo.id)
    expect(recusada).toMatchObject({ status: 409, corpo: { erro: 'TRANSICAO_INVALIDA' } })
    expect(recusada.corpo.mensagem).toMatch(/já foi retirada/)
    expect(await statusNoBanco(retirada.corpo.id)).toBe('RETIRADA')
    expect(await estoque('p-jaqueta')).toBe(2)

    const duasVezes = await novaReserva({ produtoId: 'p-sandalia', formaPagamento: 'NA_LOJA' })
    expect((await cancelarComo(duasVezes.corpo.id)).status).toBe(200)
    expect((await cancelarComo(duasVezes.corpo.id)).status).toBe(409)
    expect(await estoque('p-sandalia')).toBe(4)

    const vencida = await novaReserva({ produtoId: 'p-run', formaPagamento: 'NA_LOJA' })
    await env.DB.prepare("UPDATE reserva SET expira_em = datetime('now', '-1 minutes') WHERE id = ?1").bind(vencida.corpo.id).run()
    expect((await cancelarComo(vencida.corpo.id)).status).toBe(409)
    // Expirou na leitura e o estoque voltou uma vez só.
    expect(await estoque('p-run')).toBe(5)
  })
})

describe('GET /api/me/carteira', () => {
  it('TA17: QR, saldo, nível pelos 12 meses, quanto falta, cupons com tipo e valor, reservas em aberto', async () => {
    const r1 = await novaReserva({ produtoId: 'p-pulse', formaPagamento: 'NA_LOJA' })
    const c = await chamar(carteira, { url: '/api/me/carteira', usuario: ANA })
    expect(c.status).toBe(200)
    expect(c.corpo).toEqual({
      qrToken: 'q-ana',
      pontos: 2140,
      nivel: 'CAPIM',
      proximoNivel: { nivel: 'DOURADO', faltam: 2860 },
      cupons: [
        { id: 'cp-a-10', titulo: '10% em calçados', loja: 'Loja A', validade: '2099-12-31', tipo: 'PERCENTUAL', valor: 10, nivelMinimo: 'SEMENTE', categoria: 'Calçados' },
        { id: 'cp-b-5', titulo: '5% em perfumes', loja: 'Loja B', validade: '2099-12-31', tipo: 'PERCENTUAL', valor: 5, nivelMinimo: 'SEMENTE', categoria: null },
        { id: 'cp-a-15', titulo: 'R$ 15 em camisetas', loja: 'Loja A', validade: '2099-12-31', tipo: 'VALOR', valor: 1500, nivelMinimo: 'SEMENTE', categoria: 'Roupas' },
        { id: 'cp-shopping-20', titulo: 'R$ 20 em qualquer loja', loja: null, validade: '2099-12-31', tipo: 'VALOR', valor: 2000, nivelMinimo: 'SEMENTE', categoria: null },
      ],
      reservasAtivas: [
        {
          id: r1.corpo.id,
          produto: 'Tênis de corrida Pulse',
          status: 'PENDENTE',
          pago: false,
          // O Pulse só tem uma cor: ela entra sozinha. Tamanho, a cliente não escolheu.
          tamanho: null,
          cor: 'preto',
          precoCentavos: 39990,
          cupom: null,
          prontaEm: null,
          expiraEm: r1.corpo.expiraEm,
          loja: { nome: 'Loja A', piso: 1, mapaId: 'mapa-loja-a' },
        },
      ],
    })
  })

  it('cliente novo, sem compras, é Semente; admin e lojista não têm carteira', async () => {
    const c = await chamar(carteira, { url: '/api/me/carteira', usuario: BRUNO })
    expect(c.corpo).toMatchObject({ nivel: 'SEMENTE', proximoNivel: { nivel: 'BROTO', faltam: 500 } })
    expect((await chamar(carteira, { url: '/api/me/carteira', usuario: LOJISTA_A })).status).toBe(403)
  })
})

describe('GET /api/me/favoritos', () => {
  it('os salvos, do mais recente para o mais antigo, sem produto inativo, com paginação', async () => {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO favorito (cliente_id, produto_id, criado_em) VALUES ('c-ana', 'p-pulse', datetime('now', '-2 days'))"),
      env.DB.prepare("INSERT INTO favorito (cliente_id, produto_id, criado_em) VALUES ('c-ana', 'p-perfume', datetime('now', '-1 days'))"),
      env.DB.prepare("INSERT INTO favorito (cliente_id, produto_id, criado_em) VALUES ('c-ana', 'p-inativo', datetime('now'))"),
      env.DB.prepare("INSERT INTO favorito (cliente_id, produto_id) VALUES ('c-bruno', 'p-run')"),
    ])
    const f = await chamar(favoritos, { url: '/api/me/favoritos', usuario: ANA })
    expect(f.corpo.total).toBe(2)
    expect(f.corpo.itens.map((p: { id: string }) => p.id)).toEqual(['p-perfume', 'p-pulse'])
    expect(f.corpo.itens[1]).toMatchObject({ nome: 'Tênis de corrida Pulse', precoCentavos: 39990, loja: { mapaId: 'mapa-loja-a' } })
    const pagina2 = await chamar(favoritos, { url: '/api/me/favoritos?pagina=2&tamanho=1', usuario: ANA })
    expect(pagina2.corpo).toMatchObject({ total: 2, itens: [{ id: 'p-pulse' }] })
  })
})

describe('cupom na reserva (RN15)', () => {
  const cuponsDe = (produtoId: string, usuario = ANA) =>
    chamar(cuponsDoProduto, { url: `/api/produtos/${produtoId}/cupons`, params: { id: produtoId }, usuario })

  it('TA49: os cupons que valem para o produto; o preço e o Pix saem com o desconto, e o cupom fica preso até cancelar', async () => {
    // O tênis (calçados, Loja A): o de calçados e o voucher; o de camisetas não.
    const valem = await cuponsDe('p-pulse')
    expect(valem.status).toBe(200)
    expect(valem.corpo.tamanhos).toEqual(['40', '41', '42', '43'])
    expect(valem.corpo.itens).toEqual([
      { id: 'cp-a-10', titulo: '10% em calçados', origem: 'LOJA', loja: 'Loja A', categoria: 'Calçados', descontoCentavos: 3999 },
      { id: 'cp-shopping-20', titulo: 'R$ 20 em qualquer loja', origem: 'SHOPPING', loja: null, categoria: null, descontoCentavos: 2000 },
    ])
    // O de camisetas num tênis é recusado; tamanho que não existe é 400.
    expect((await novaReserva({ produtoId: 'p-pulse', formaPagamento: 'PIX', cupomId: 'cp-a-15' })).status).toBe(422)
    expect((await novaReserva({ produtoId: 'p-pulse', formaPagamento: 'PIX', tamanho: '50' })).status).toBe(400)

    const r = await novaReserva({ produtoId: 'p-pulse', formaPagamento: 'PIX', tamanho: '42', cupomId: 'cp-a-10' })
    expect(r.status).toBe(201)
    expect(r.corpo).toMatchObject({
      tamanho: '42',
      cor: 'preto',
      brutoCentavos: 39990,
      descontoCentavos: 3999,
      precoCentavos: 35991,
      cupom: { id: 'cp-a-10', titulo: '10% em calçados', origem: 'LOJA' },
    })
    expect(r.corpo.pix.copiaECola).toContain('359.91')
    // Preso à reserva: some da carteira, do balcão e da próxima reserva.
    const naCarteira = await chamar(carteira, { url: '/api/me/carteira', usuario: ANA })
    expect(naCarteira.corpo.cupons.map((c: { id: string }) => c.id)).not.toContain('cp-a-10')
    expect((await cuponsDe('p-run')).corpo.itens.map((c: { id: string }) => c.id)).toEqual(['cp-shopping-20'])
    const balcao = await chamar(atendimento, { url: '/api/loja/atendimento/q-ana', params: { qr: 'q-ana' }, usuario: LOJISTA_A })
    expect(balcao.corpo.cupons.map((c: { id: string }) => c.id)).not.toContain('cp-a-10')
    expect(balcao.corpo.reservas[0]).toMatchObject({ tamanho: '42', precoCentavos: 35991, cupom: { id: 'cp-a-10' }, podeRetirar: false })

    // Cancelada, o cupom volta.
    await chamar(cancelar, { metodo: 'PATCH', url: `/api/reservas/${r.corpo.id}/cancelar`, params: { id: r.corpo.id }, usuario: ANA })
    expect((await cuponsDe('p-run')).corpo.itens.map((c: { id: string }) => c.id)).toEqual(['cp-a-10', 'cp-shopping-20'])
  })
})

describe('avisos do app: GET /api/me/notificacoes', () => {
  it('TA50: cada mudança da reserva vira um aviso, com o selo do Início e o da Carteira, e marcar como lidos zera', async () => {
    const r = await novaReserva({ produtoId: 'p-pulse', formaPagamento: 'NA_LOJA' })
    const id = r.corpo.id
    await chamar(mudarNaLoja, { metodo: 'PATCH', url: `/api/loja/reservas/${id}`, params: { id }, corpo: { status: 'CONFIRMADA', prontaAs: '23:59' }, usuario: LOJISTA_A })
    const lista = await chamar(notificacoes, { url: '/api/me/notificacoes', usuario: ANA })
    expect(lista.status).toBe(200)
    expect(lista.corpo.naoLidas).toEqual({ total: 2, reservas: 2 })
    expect(lista.corpo.itens.map((n: { titulo: string }) => n.titulo)).toEqual(['Loja A confirmou sua reserva', 'Reserva enviada para a loja'])
    expect(lista.corpo.itens[0]).toMatchObject({ tipo: 'RESERVA', lida: false, destino: `/reserva/${id}` })
    // Outro cliente não vê os avisos da Ana.
    expect((await chamar(notificacoes, { url: '/api/me/notificacoes', usuario: BRUNO })).corpo.itens).toEqual([])

    const lidas = await chamar(marcarLidas, { metodo: 'POST', url: '/api/me/notificacoes/lidas', corpo: { tipo: 'RESERVA' }, usuario: ANA })
    expect(lidas.corpo).toEqual({ lidas: 2 })
    expect((await chamar(notificacoes, { url: '/api/me/notificacoes', usuario: ANA })).corpo.naoLidas).toEqual({ total: 0, reservas: 0 })
    expect((await chamar(marcarLidas, { metodo: 'POST', url: '/api/me/notificacoes/lidas', corpo: { tipo: 'OUTRO' }, usuario: ANA })).status).toBe(400)
  })
})
