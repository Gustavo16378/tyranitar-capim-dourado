// Os mocks de src/api/mocks precisam responder no formato do docs/api.md e seguir as regras da
// API, para a troca pela API real não mudar nada nas telas.
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Cada teste começa com o estado dos mocks zerado (estoque, reservas, pontos).
async function mocks() {
  vi.resetModules()
  return {
    produtos: await import('../../src/api/mocks/produtos'),
    reservas: await import('../../src/api/mocks/reservas'),
    carteira: await import('../../src/api/mocks/carteira'),
    ofertas: await import('../../src/api/mocks/ofertas'),
    chat: await import('../../src/api/mocks/chat'),
  }
}

let m: Awaited<ReturnType<typeof mocks>>
beforeEach(async () => {
  m = await mocks()
})

describe('mock de produtos', () => {
  it('GET /api/produtos devolve { itens, total } com a loja de cada produto', async () => {
    const lista = await m.produtos.listarProdutos({ q: 'tênis' })
    expect(lista.total).toBe(2)
    expect(Object.keys(lista.itens[0]).sort()).toEqual(
      ['categoria', 'estoque', 'foto', 'id', 'loja', 'nome', 'precoCentavos'].sort(),
    )
    expect(Object.keys(lista.itens[0].loja).sort()).toEqual(['id', 'mapaId', 'nome', 'piso'])
  })

  it('busca sem acento e por qualquer palavra', async () => {
    const lista = await m.produtos.listarProdutos({ q: 'TENIS preto' })
    expect(lista.itens.map((p) => p.id)).toContain('p-pulse')
  })

  it('GET /api/produtos/{id} traz outras lojas e 404 quando não existe', async () => {
    const produto = await m.produtos.obterProduto('p-pulse')
    expect(produto.outrasLojas[0]).toMatchObject({ id: 'p-run', loja: { nome: 'Calçados' } })
    expect(produto.avaliacao).toEqual({ media: 5, total: 1 })
    await expect(m.produtos.obterProduto('nao-existe')).rejects.toMatchObject({ status: 404, erro: 'NAO_ENCONTRADO' })
  })
})

describe('mock de reservas', () => {
  const agora = Date.parse('2026-11-13T12:00:00Z')

  it('pagar na loja: PENDENTE, sem Pix, expira em 4 h (RN01) e desconta o estoque (RN03)', async () => {
    const reserva = await m.reservas.criarReserva(
      { produtoId: 'p-run', quantidade: 1, formaPagamento: 'NA_LOJA' },
      agora,
    )
    expect(reserva).toEqual({
      id: expect.any(String),
      status: 'PENDENTE',
      formaPagamento: 'NA_LOJA',
      pago: false,
      precoCentavos: 34990,
      expiraEm: '2026-11-13T16:00:00.000Z',
    })
    expect(m.produtos.acharProduto('p-run')?.estoque).toBe(4)
  })

  it('Pix: traz o copia e cola simulado e, pago, expira em 48 h (RN02)', async () => {
    const reserva = await m.reservas.criarReserva({ produtoId: 'p-pulse', quantidade: 1, formaPagamento: 'PIX' }, agora)
    expect(reserva.pix).toEqual({ copiaECola: expect.stringMatching(/^000201/), simulado: true })
    const paga = await m.reservas.pagarReserva(reserva.id, agora)
    expect(paga).toMatchObject({ pago: true, expiraEm: '2026-11-15T12:00:00.000Z' })
  })

  it('pagar duas vezes dá 409', async () => {
    const reserva = await m.reservas.criarReserva({ produtoId: 'p-pulse', quantidade: 1, formaPagamento: 'PIX' })
    await m.reservas.pagarReserva(reserva.id)
    await expect(m.reservas.pagarReserva(reserva.id)).rejects.toMatchObject({ status: 409 })
  })

  it('sem estoque dá 409 SEM_ESTOQUE', async () => {
    await expect(
      m.reservas.criarReserva({ produtoId: 'p-fone', quantidade: 1, formaPagamento: 'NA_LOJA' }),
    ).rejects.toMatchObject({ status: 409, erro: 'SEM_ESTOQUE', mensagem: expect.any(String) })
  })
})

describe('mock da carteira', () => {
  it('GET /api/me/carteira no formato do contrato, com as reservas ativas', async () => {
    await m.reservas.criarReserva({ produtoId: 'p-pulse', quantidade: 1, formaPagamento: 'PIX' })
    const carteira = await m.carteira.obterCarteira()
    expect(carteira).toMatchObject({
      qrToken: expect.any(String),
      pontos: 2140,
      nivel: 'CAPIM',
      proximoNivel: { nivel: 'DOURADO', faltam: 2860 },
      reservasAtivas: [{ id: expect.any(String), produto: 'Tênis de corrida Pulse', status: 'PENDENTE' }],
    })
    expect(carteira.cupons[0]).toMatchObject({
      id: 'cp1',
      titulo: '10% em calçados',
      loja: 'Loja de esportes',
      validade: '2026-12-31',
    })
  })
})

describe('mock da Capi', () => {
  it('a pergunta do roteiro tem a resposta salva, com reservar e rota', async () => {
    const resposta = await m.chat.enviarMensagem({ texto: m.chat.PERGUNTA_DEMO.texto })
    expect(resposta.produtos.map((p) => p.id)).toEqual(['p-pulse', 'p-run'])
    expect(resposta.acoes).toEqual([
      { tipo: 'RESERVAR', produtoId: 'p-pulse' },
      { tipo: 'ROTA', mapaId: 'loja-esportes', piso: 1 },
    ])
  })

  it('outra mensagem vira busca, e sem resultado não inventa produto (RN14)', async () => {
    expect((await m.chat.enviarMensagem({ texto: 'perfume' })).produtos[0].id).toBe('p-perfume')
    expect((await m.chat.enviarMensagem({ texto: 'geladeira' })).produtos).toEqual([])
  })
})
