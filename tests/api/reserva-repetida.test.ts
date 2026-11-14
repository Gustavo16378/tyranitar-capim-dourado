// Reserva repetida (docs/testes.md: TA57): POST /api/reservas recusa com 409 uma segunda reserva em
// aberto do mesmo cliente para o mesmo produto, tamanho e cor, com o link da que já existe. Era o
// bug da demonstração: a Capi reservava sozinha e a tela reservava de novo.
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { onRequestPatch as cancelar } from '../../functions/api/reservas/[id]/cancelar'
import { onRequestPost as reservar } from '../../functions/api/reservas/index'
import { ANA, BRUNO, chamar } from '../workers/rotas'
import type { UsuarioSessao } from '../../functions/_lib/auth/jwt'

const pedir = (corpo: Record<string, unknown>, usuario: UsuarioSessao = ANA) =>
  chamar(reservar, { metodo: 'POST', url: '/api/reservas', corpo: { formaPagamento: 'NA_LOJA', ...corpo }, usuario })
const estoque = async () => (await env.DB.prepare("SELECT estoque FROM produto WHERE id = 'p-run'").first<{ estoque: number }>())!.estoque

describe('POST /api/reservas, a mesma reserva duas vezes', () => {
  it('TA57: a segunda reserva igual é 409 com o link da primeira; outro tamanho, outra pessoa ou depois de cancelar, passa', async () => {
    const antes = await estoque()
    const primeira = await pedir({ produtoId: 'p-run', tamanho: '41' })
    expect(primeira.status).toBe(201)

    const repetida = await pedir({ produtoId: 'p-run', tamanho: '41', formaPagamento: 'PIX' })
    expect(repetida.status).toBe(409)
    expect(repetida.corpo).toEqual({
      status: 409,
      erro: 'RESERVA_REPETIDA',
      mensagem: 'Você já tem uma reserva deste produto.',
      reserva: { id: primeira.corpo.id, link: `/reserva/${primeira.corpo.id}` },
    })
    // O estoque baixou uma vez só.
    expect(await estoque()).toBe(antes - 1)

    // Outro tamanho é outra reserva; outra pessoa também.
    expect((await pedir({ produtoId: 'p-run', tamanho: '42' })).status).toBe(201)
    expect((await pedir({ produtoId: 'p-run', tamanho: '41' }, BRUNO)).status).toBe(201)

    // Cancelada, a primeira não segura mais: dá para reservar de novo.
    await chamar(cancelar, {
      metodo: 'PATCH',
      url: `/api/reservas/${primeira.corpo.id}/cancelar`,
      params: { id: primeira.corpo.id },
      usuario: ANA,
    })
    expect((await pedir({ produtoId: 'p-run', tamanho: '41' })).status).toBe(201)
  })

  it('a reserva vencida não segura: o prazo é conferido antes', async () => {
    const primeira = await pedir({ produtoId: 'p-pulse', tamanho: '42' })
    expect(primeira.status).toBe(201)
    await env.DB.prepare("UPDATE reserva SET expira_em = datetime('now', '-1 minutes') WHERE id = ?1").bind(primeira.corpo.id).run()
    const nova = await pedir({ produtoId: 'p-pulse', tamanho: '42' })
    expect(nova.status).toBe(201)
    expect(await env.DB.prepare('SELECT status FROM reserva WHERE id = ?1').bind(primeira.corpo.id).first()).toEqual({
      status: 'EXPIRADA',
    })
  })

  it('a cor única entra sozinha e conta: a mesma camiseta M duas vezes é recusada', async () => {
    // A camiseta só tem a cor azul: ela vai para as duas reservas sem o cliente escolher.
    expect((await pedir({ produtoId: 'p-camiseta', tamanho: 'M' })).status).toBe(201)
    expect((await pedir({ produtoId: 'p-camiseta', tamanho: 'M' })).corpo.erro).toBe('RESERVA_REPETIDA')
  })
})
