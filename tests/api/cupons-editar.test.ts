// Editar, desativar, reativar e excluir cupons da loja e vouchers do shopping (docs/testes.md:
// TA51 a TA56): PUT e DELETE /api/loja/cupons/{id} e /api/shopping/cupons/{id}. Nunca usado e sem
// reserva, tudo muda e dá para excluir; já usado (ou preso numa reserva), só o título, a validade,
// o limite por cliente e o ativo. A reserva feita com o cupom guarda o desconto, mesmo desativado.
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { onRequestGet as atendimento } from '../../functions/api/loja/atendimento/[qr]'
import { onRequestPost as registrarCompra } from '../../functions/api/loja/compras/index'
import { onRequestGet as listarCupons, onRequestPost as criarCupom } from '../../functions/api/loja/cupons'
import { onRequestDelete as excluirDaLoja, onRequestPut as editarDaLoja } from '../../functions/api/loja/cupons/[id]'
import { onRequestPatch as responderReserva } from '../../functions/api/loja/reservas/[id]'
import { onRequestGet as carteira } from '../../functions/api/me/carteira'
import { onRequestGet as cuponsDoProduto } from '../../functions/api/produtos/[id]/cupons'
import { onRequestPatch as cancelarReserva } from '../../functions/api/reservas/[id]/cancelar'
import { onRequestPost as reservar } from '../../functions/api/reservas/index'
import { onRequestDelete as excluirVoucher, onRequestPut as editarVoucher } from '../../functions/api/shopping/cupons/[id]'
import { ADMIN, ANA, chamar, LOJISTA_A, LOJISTA_B } from '../workers/rotas'
import type { UsuarioSessao } from '../../functions/_lib/auth/jwt'

const sql = (comando: string, ...valores: unknown[]) => env.DB.prepare(comando).bind(...valores).run()

const editar = (id: string, corpo: unknown, usuario: UsuarioSessao = LOJISTA_A) =>
  chamar(editarDaLoja, { metodo: 'PUT', url: `/api/loja/cupons/${id}`, params: { id }, corpo, usuario })
const excluir = (id: string, usuario: UsuarioSessao = LOJISTA_A) =>
  chamar(excluirDaLoja, { metodo: 'DELETE', url: `/api/loja/cupons/${id}`, params: { id }, usuario })

/** Um cupom novo da Loja A, nunca usado. */
async function cupomNovo(extra: Record<string, unknown> = {}) {
  const corpo = {
    titulo: 'R$ 30 em tênis',
    tipo: 'VALOR',
    valor: 3000,
    categoriaAlvo: 'calcados',
    nivelMinimo: 'SEMENTE',
    limitePorCliente: 1,
    validade: '2099-12-13',
    ...extra,
  }
  const r = await chamar(criarCupom, { metodo: 'POST', url: '/api/loja/cupons', corpo, usuario: LOJISTA_A })
  expect(r.status).toBe(201)
  return r.corpo as { id: string }
}

/** Uma compra da Ana na Loja A que usou o cupom. */
async function usar(cupomId: string) {
  await sql(
    "INSERT INTO compra (id, cliente_id, loja_id, valor_centavos, origem, pontos_gerados) VALUES ('co-uso', 'c-ana', 'loja-a', 35991, 'CAIXA', 359)",
  )
  await sql("INSERT INTO uso_cupom (compra_id, cupom_id, desconto_centavos) VALUES ('co-uso', ?1, 3999)", cupomId)
}

/** A Ana reserva o produto com o cupom; devolve a reserva. */
async function reservarCom(produtoId: string, cupomId: string) {
  const r = await chamar(reservar, {
    metodo: 'POST',
    url: '/api/reservas',
    corpo: { produtoId, formaPagamento: 'NA_LOJA', cupomId },
    usuario: ANA,
  })
  expect(r.status).toBe(201)
  return r.corpo as { id: string; precoCentavos: number; descontoCentavos: number }
}

const idsDaCarteira = async () =>
  ((await chamar(carteira, { url: '/api/me/carteira', usuario: ANA })).corpo.cupons as { id: string }[]).map((c) => c.id)
const idsDoBalcao = async () =>
  (
    (await chamar(atendimento, { url: '/api/loja/atendimento/q-ana', params: { qr: 'q-ana' }, usuario: LOJISTA_A })).corpo
      .cupons as { id: string }[]
  ).map((c) => c.id)

describe('PUT /api/loja/cupons/{id}', () => {
  it('TA51: o cupom nunca usado muda inteiro; os campos que não vêm ficam como estão', async () => {
    const { id } = await cupomNovo()
    const novo = {
      titulo: '20% em roupas',
      tipo: 'PERCENTUAL',
      valor: 20,
      categoriaAlvo: 'roupas',
      nivelMinimo: 'BROTO',
      limitePorCliente: 2,
      validade: '2099-06-30',
    }
    const r = await editar(id, novo)
    expect(r.status).toBe(200)
    expect(r.corpo).toMatchObject({ id, ...novo, ativo: true, usos: 0, reservas: 0, emUso: false })

    const soTitulo = await editar(id, { titulo: '20% em toda a roupa' })
    expect(soTitulo.corpo).toMatchObject({ ...novo, titulo: '20% em toda a roupa' })

    // As regras da criação valem na edição.
    expect((await editar(id, { titulo: 'ab' })).status).toBe(400)
    expect((await editar(id, { valor: 150 })).status).toBe(400)
    expect((await editar(id, { validade: '2020-01-01' })).status).toBe(400)
    expect((await editar(id, { ativo: 'sim' })).status).toBe(400)
    expect((await editar('nao-existe', { titulo: 'Qualquer um' })).status).toBe(404)
  })

  it('TA52: já usado, muda só o título, a validade e o limite; o tipo, o valor, a categoria e o nível são 409', async () => {
    await usar('cp-a-10')
    const livres = await editar('cp-a-10', { titulo: '10% em tênis e sapatos', validade: '2099-01-31', limitePorCliente: 3 })
    expect(livres.status).toBe(200)
    expect(livres.corpo).toMatchObject({
      titulo: '10% em tênis e sapatos',
      validade: '2099-01-31',
      limitePorCliente: 3,
      tipo: 'PERCENTUAL',
      valor: 10,
      usos: 1,
      emUso: true,
    })

    const valor = await editar('cp-a-10', { valor: 20 })
    expect(valor.status).toBe(409)
    expect(valor.corpo).toMatchObject({ erro: 'CUPOM_EM_USO' })
    expect(valor.corpo.mensagem).toMatch(/^Esse cupom já foi usado numa compra ou está numa reserva: O valor não muda mais\./)
    const varios = await editar('cp-a-10', { tipo: 'VALOR', valor: 1000, categoriaAlvo: null, nivelMinimo: 'DOURADO' })
    expect(varios.status).toBe(409)
    expect(varios.corpo.mensagem).toContain('O tipo, o valor, a categoria e o nível mínimo não mudam mais')

    // O formulário manda tudo: os campos travados iguais aos de agora não atrapalham.
    const igual = await editar('cp-a-10', {
      titulo: '10% em calçados',
      tipo: 'PERCENTUAL',
      valor: 10,
      categoriaAlvo: 'calcados',
      nivelMinimo: 'SEMENTE',
      limitePorCliente: 1,
      validade: '2099-12-31',
    })
    expect(igual.status).toBe(200)
    const linha = await env.DB.prepare("SELECT tipo, valor, categoria_alvo FROM cupom WHERE id = 'cp-a-10'").first()
    expect(linha).toEqual({ tipo: 'PERCENTUAL', valor: 10, categoria_alvo: 'calcados' })
  })

  it('TA53: desativar tira o cupom da carteira, do balcão e da reserva; reativar devolve', async () => {
    expect(await idsDaCarteira()).toContain('cp-a-10')
    const desativado = await editar('cp-a-10', { ativo: false })
    expect(desativado.status).toBe(200)
    expect(desativado.corpo).toMatchObject({ ativo: false })
    expect(await idsDaCarteira()).not.toContain('cp-a-10')
    expect(await idsDoBalcao()).not.toContain('cp-a-10')
    const naReserva = await chamar(cuponsDoProduto, { url: '/api/produtos/p-pulse/cupons', params: { id: 'p-pulse' }, usuario: ANA })
    expect(naReserva.corpo.itens.map((c: { id: string }) => c.id)).not.toContain('cp-a-10')
    // Continua na lista do painel, desativado.
    const lista = await chamar(listarCupons, { url: '/api/loja/cupons', usuario: LOJISTA_A })
    expect(lista.corpo.itens.find((c: { id: string }) => c.id === 'cp-a-10')).toMatchObject({ ativo: false })

    expect((await editar('cp-a-10', { ativo: true })).corpo).toMatchObject({ ativo: true })
    expect(await idsDaCarteira()).toContain('cp-a-10')
    expect(await idsDoBalcao()).toContain('cp-a-10')

    // Um cupom vencido também desativa: a validade que já passou vale se não mudou.
    expect((await editar('cp-a-vencido', { ativo: false })).status).toBe(200)
  })
})

describe('DELETE /api/loja/cupons/{id}', () => {
  it('TA54: exclui o nunca usado; o usado e o que está numa reserva são 409, sugerindo desativar', async () => {
    const { id } = await cupomNovo()
    const r = await excluir(id)
    expect(r.status).toBe(204)
    expect(await env.DB.prepare('SELECT id FROM cupom WHERE id = ?1').bind(id).first()).toBeNull()
    expect((await excluir(id)).status).toBe(404)

    await usar('cp-a-10')
    const usado = await excluir('cp-a-10')
    expect(usado.status).toBe(409)
    expect(usado.corpo).toMatchObject({ erro: 'CUPOM_EM_USO' })
    expect(usado.corpo.mensagem).toContain('Desative o cupom')

    // Preso numa reserva (e mesmo depois de ela ser cancelada, porque a reserva guarda o desconto).
    const reserva = await reservarCom('p-camiseta', 'cp-a-15')
    expect((await excluir('cp-a-15')).status).toBe(409)
    expect((await editar('cp-a-15', { valor: 2000 })).status).toBe(409)
    await chamar(cancelarReserva, { metodo: 'PATCH', url: `/api/reservas/${reserva.id}/cancelar`, params: { id: reserva.id }, usuario: ANA })
    expect((await excluir('cp-a-15')).status).toBe(409)
    expect(await env.DB.prepare("SELECT id FROM cupom WHERE id = 'cp-a-15'").first()).not.toBeNull()
  })
})

describe('a reserva com o cupom', () => {
  it('TA55: a reserva feita com o cupom guarda o desconto, mesmo com ele desativado', async () => {
    const reserva = await reservarCom('p-pulse', 'cp-a-10')
    expect(reserva).toMatchObject({ descontoCentavos: 3999, precoCentavos: 35991 })
    const confirmar = await chamar(responderReserva, {
      metodo: 'PATCH',
      url: `/api/loja/reservas/${reserva.id}`,
      params: { id: reserva.id },
      corpo: { status: 'CONFIRMADA' },
      usuario: LOJISTA_A,
    })
    expect(confirmar.status).toBe(200)

    expect((await editar('cp-a-10', { ativo: false })).corpo).toMatchObject({ ativo: false })
    const compra = await chamar(registrarCompra, {
      metodo: 'POST',
      url: '/api/loja/compras',
      corpo: { qrToken: 'q-ana', itens: [{ reservaId: reserva.id }], cupons: [] },
      usuario: LOJISTA_A,
    })
    expect(compra.status).toBe(201)
    expect(compra.corpo).toMatchObject({
      valorBrutoCentavos: 39990,
      descontos: [{ cupom: 'cp-a-10', centavos: 3999 }],
      valorPagoCentavos: 35991,
    })
  })
})

describe('isolamento', () => {
  it('TA56: a loja só mexe nos cupons dela, e o shopping só nos vouchers', async () => {
    const outraLoja = await editar('cp-a-10', { titulo: 'De outra loja' }, LOJISTA_B)
    expect(outraLoja.status).toBe(403)
    expect(outraLoja.corpo.mensagem).toBe('Esse cupom é de outra loja.')
    expect((await excluir('cp-a-10', LOJISTA_B)).status).toBe(403)

    const voucherPelaLoja = await editar('cp-shopping-20', { ativo: false })
    expect(voucherPelaLoja.status).toBe(403)
    expect(voucherPelaLoja.corpo.mensagem).toMatch(/voucher do shopping/)
    expect((await excluir('cp-shopping-20')).status).toBe(403)

    const pelaAdministracao = (id: string, corpo: unknown) =>
      chamar(editarVoucher, { metodo: 'PUT', url: `/api/shopping/cupons/${id}`, params: { id }, corpo, usuario: ADMIN })
    const cupomDaLoja = await pelaAdministracao('cp-a-10', { ativo: false })
    expect(cupomDaLoja.status).toBe(403)
    expect(cupomDaLoja.corpo.mensagem).toMatch(/só a própria loja/)
    const voucher = await pelaAdministracao('cp-shopping-20', { ativo: false, titulo: 'R$ 20 nas lojas' })
    expect(voucher.status).toBe(200)
    expect(voucher.corpo).toMatchObject({ titulo: 'R$ 20 nas lojas', ativo: false })
    const excluirDaAdministracao = await chamar(excluirVoucher, {
      metodo: 'DELETE',
      url: '/api/shopping/cupons/cp-a-10',
      params: { id: 'cp-a-10' },
      usuario: ADMIN,
    })
    expect(excluirDaAdministracao.status).toBe(403)

    // O lojista nas rotas do shopping: o perfil já barra antes da rota.
    const lojistaNoShopping = await chamar(editarVoucher, {
      metodo: 'PUT',
      url: '/api/shopping/cupons/cp-shopping-20',
      params: { id: 'cp-shopping-20' },
      corpo: { ativo: true },
      usuario: LOJISTA_A,
    })
    expect(lojistaNoShopping.status).toBe(403)
    expect(await env.DB.prepare("SELECT ativo FROM cupom WHERE id = 'cp-a-10'").first()).toEqual({ ativo: 1 })
  })
})
