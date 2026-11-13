// Rotas do app do cliente registradas pela fase-3 no docs/api.md (TA04, TA11 a TA13, TA17).
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { lerToken } from '../../functions/_lib/auth/jwt'
import { onRequestPost as cadastro } from '../../functions/api/auth/cadastro'
import { onRequestPost as demo } from '../../functions/api/auth/demo'
import { onRequestGet as carteira } from '../../functions/api/me/carteira'
import { onRequestGet as favoritos } from '../../functions/api/me/favoritos/index'
import { onRequestGet as lerReserva } from '../../functions/api/reservas/[id]/index'
import { onRequestPost as pagar } from '../../functions/api/reservas/[id]/pagamento'
import { onRequestPost as reservar } from '../../functions/api/reservas/index'
import { ANA, BRUNO, chamar, LOJISTA_A } from '../workers/rotas'

const um = async <T>(sql: string, ...valores: unknown[]) => (await env.DB.prepare(sql).bind(...valores).first<T>())!
const HORA = 60 * 60 * 1000

const novaReserva = (corpo: Record<string, unknown>, usuario = ANA) =>
  chamar(reservar, { metodo: 'POST', url: '/api/reservas', corpo, usuario })

describe('POST /api/auth/demo', () => {
  it('desligada (sem DEMO=1) responde 404', async () => {
    const r = await chamar(demo, { metodo: 'POST', url: '/api/auth/demo' })
    expect(r.status).toBe(404)
  })

  it('com DEMO=1, entra como a Ana, sempre com perfil de cliente', async () => {
    await env.DB.prepare("UPDATE usuario SET email = 'ana.souza@demo.test' WHERE id = 'c-ana'").run()
    const r = await chamar(demo, { metodo: 'POST', url: '/api/auth/demo', ambiente: { DEMO: '1' } })
    expect(r.status).toBe(200)
    expect(r.corpo.usuario).toEqual({ id: 'c-ana', nome: 'Ana Souza', perfil: 'CLIENTE', lojaId: null })
    expect((await lerToken(r.corpo.token, env.JWT_SECRET)).perfil).toBe('CLIENTE')
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

  it('TA12: Pix: vem o copia e cola; pagar deixa paga, ainda PENDENTE, por 48 h; pagar de novo é 409', async () => {
    const r = await novaReserva({ produtoId: 'p-run', quantidade: 2, formaPagamento: 'PIX' })
    expect(r.corpo).toMatchObject({ formaPagamento: 'PIX', pago: false, precoCentavos: 69980, pix: { simulado: true } })
    expect(r.corpo.pix.copiaECola).toMatch(/^000201/)
    const antes = Date.now()
    const pago = await chamar(pagar, { metodo: 'POST', url: `/api/reservas/${r.corpo.id}/pagamento`, params: { id: r.corpo.id }, usuario: ANA })
    expect(pago.status).toBe(200)
    expect(pago.corpo).toMatchObject({ status: 'PENDENTE', pago: true })
    expect(Math.abs(Date.parse(pago.corpo.expiraEm) - antes - 48 * HORA)).toBeLessThan(5000)
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
        { id: 'cp-a-10', titulo: '10% em calçados', loja: 'Loja A', validade: '2099-12-31', tipo: 'PERCENTUAL', valor: 10, nivelMinimo: 'SEMENTE' },
        { id: 'cp-b-5', titulo: '5% em perfumes', loja: 'Loja B', validade: '2099-12-31', tipo: 'PERCENTUAL', valor: 5, nivelMinimo: 'SEMENTE' },
        { id: 'cp-a-15', titulo: 'R$ 15 em camisetas', loja: 'Loja A', validade: '2099-12-31', tipo: 'VALOR', valor: 1500, nivelMinimo: 'SEMENTE' },
        { id: 'cp-shopping-20', titulo: 'R$ 20 em qualquer loja', loja: null, validade: '2099-12-31', tipo: 'VALOR', valor: 2000, nivelMinimo: 'SEMENTE' },
      ],
      reservasAtivas: [
        {
          id: r1.corpo.id,
          produto: 'Tênis de corrida Pulse',
          status: 'PENDENTE',
          pago: false,
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
