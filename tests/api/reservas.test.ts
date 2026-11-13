// Criação de reserva no D1 (caixa-cinza): a resposta e o que ficou gravado.
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { criarReserva } from '../../functions/_lib/repo/reservas'

const estoque = async (id: string) =>
  (await env.DB.prepare('SELECT estoque FROM produto WHERE id = ?1').bind(id).first<{ estoque: number }>())?.estoque

describe('criação de reserva', () => {
  it('TA11: reserva para pagar na loja baixa o estoque e expira em 4 h', async () => {
    const agora = new Date('2026-11-13T13:00:00Z')
    const r = await criarReserva(env.DB, {
      clienteId: 'c-ana',
      produtoId: 'p-pulse',
      quantidade: 1,
      formaPagamento: 'NA_LOJA',
      agora,
    })
    expect(r).toMatchObject({ status: 'PENDENTE', pago: false, lojaId: 'loja-a', precoCentavos: 39990 })
    expect(r.expiraEm).toBe('2026-11-13T17:00:00.000Z')
    expect(await estoque('p-pulse')).toBe(1)
  })

  it('cada teste começa com o banco do seed (o estoque do teste anterior volta)', async () => {
    expect(await estoque('p-pulse')).toBe(2)
  })

  it('TA13: produto sem estoque é SEM_ESTOQUE', async () => {
    await expect(
      criarReserva(env.DB, { clienteId: 'c-ana', produtoId: 'p-hidratante', quantidade: 1, formaPagamento: 'PIX' }),
    ).rejects.toMatchObject({ codigo: 'SEM_ESTOQUE' })
  })

  it('produto inexistente ou inativo é NAO_ENCONTRADO', async () => {
    for (const produtoId of ['nao-existe', 'p-inativo']) {
      await expect(
        criarReserva(env.DB, { clienteId: 'c-ana', produtoId, quantidade: 1, formaPagamento: 'PIX' }),
      ).rejects.toMatchObject({ codigo: 'NAO_ENCONTRADO' })
    }
  })

  it('TA14: duas reservas ao mesmo tempo da última unidade: uma passa, a outra é SEM_ESTOQUE', async () => {
    const pedido = (clienteId: string) =>
      criarReserva(env.DB, { clienteId, produtoId: 'p-ultima', quantidade: 1, formaPagamento: 'NA_LOJA' })
    const resultados = await Promise.allSettled([pedido('c-ana'), pedido('c-bruno')])
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const recusada = resultados.find((r) => r.status === 'rejected')
    expect(recusada?.reason).toMatchObject({ codigo: 'SEM_ESTOQUE' })
    expect(await estoque('p-ultima')).toBe(0)
    const { n } = (await env.DB.prepare("SELECT count(*) AS n FROM reserva WHERE produto_id = 'p-ultima'").first<{ n: number }>())!
    expect(n).toBe(1)
  })
})
