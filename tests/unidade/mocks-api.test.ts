// Os mocks de src/api/mocks precisam responder no formato do docs/api.md e seguir as regras da
// API, para a troca pela API real não mudar nada nas telas.
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Cada teste começa com o estado dos mocks zerado (estoque, reservas, pontos). Os mocks que leem
// o catálogo pela fonte atual leem dos mocks também, seja qual for a fonte do app.
async function mocks() {
  vi.resetModules()
  vi.doMock('../../src/api/fonte', () => ({ usarMock: () => true }))
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
      { produtoId: 'p-run', quantidade: 1, formaPagamento: 'NA_LOJA', tamanho: '41' },
      agora,
    )
    expect(reserva).toEqual({
      id: expect.any(String),
      status: 'PENDENTE',
      formaPagamento: 'NA_LOJA',
      pago: false,
      estornoSolicitado: false,
      brutoCentavos: 34990,
      descontoCentavos: 0,
      precoCentavos: 34990,
      tamanho: '41',
      cor: null,
      cupom: null,
      prontaEm: null,
      motivoRecusa: null,
      expiraEm: '2026-11-13T16:00:00.000Z',
    })
    expect(m.produtos.acharProduto('p-run')?.estoque).toBe(4)
  })

  it('Pix: traz o copia e cola simulado e, pago, segue PENDENTE com o prazo da loja para confirmar (RN01, RN02)', async () => {
    const reserva = await m.reservas.criarReserva({ produtoId: 'p-pulse', quantidade: 1, formaPagamento: 'PIX' }, agora)
    expect(reserva.pix).toEqual({ copiaECola: expect.stringMatching(/^000201/), simulado: true })
    const paga = await m.reservas.pagarReserva(reserva.id, agora)
    // Quem confirma e separa é a loja: pagar não muda o status, e as 48 h contam da confirmação.
    expect(paga).toMatchObject({ status: 'PENDENTE', pago: true, expiraEm: '2026-11-13T16:00:00.000Z' })
  })

  it('GET /api/reservas/{id}: a reserva com o produto no formato da busca', async () => {
    const criada = await m.reservas.criarReserva({ produtoId: 'p-pulse', quantidade: 1, formaPagamento: 'PIX' }, agora)
    const lida = await m.reservas.obterReserva(criada.id, agora)
    expect(lida).toEqual({
      ...criada,
      produto: {
        id: 'p-pulse',
        nome: 'Tênis de corrida Pulse',
        categoria: 'calcados',
        precoCentavos: 39990,
        estoque: 2,
        foto: null,
        loja: { id: 'l-esportes', nome: 'Loja de esportes', piso: 1, mapaId: 'loja-esportes' },
      },
    })
    await expect(m.reservas.obterReserva('r-999')).rejects.toMatchObject({ status: 404, erro: 'NAO_ENCONTRADO' })
  })

  it('prazo vencido é conferido na leitura: vira EXPIRADA e o estoque volta (RN03)', async () => {
    const criada = await m.reservas.criarReserva(
      { produtoId: 'p-run', quantidade: 1, formaPagamento: 'NA_LOJA' },
      agora,
    )
    expect(m.produtos.acharProduto('p-run')?.estoque).toBe(4)
    const depois = agora + 5 * 60 * 60 * 1000
    expect(await m.reservas.obterReserva(criada.id, depois)).toMatchObject({ status: 'EXPIRADA' })
    expect(m.produtos.acharProduto('p-run')?.estoque).toBe(5)
    expect(m.reservas.reservasEmAberto(depois)).toEqual([])
  })

  it('cancelar: o estoque volta, a paga por Pix pede o estorno e cancelar de novo dá 409', async () => {
    const naLoja = await m.reservas.criarReserva({ produtoId: 'p-run', quantidade: 1, formaPagamento: 'NA_LOJA' }, agora)
    expect(await m.reservas.cancelarReserva(naLoja.id, agora)).toMatchObject({ status: 'CANCELADA', estornoSolicitado: false })
    expect(m.produtos.acharProduto('p-run')?.estoque).toBe(5)
    expect(m.reservas.reservasEmAberto(agora)).toEqual([])
    await expect(m.reservas.cancelarReserva(naLoja.id, agora)).rejects.toMatchObject({ status: 409 })

    const pix = await m.reservas.criarReserva({ produtoId: 'p-pulse', quantidade: 1, formaPagamento: 'PIX' }, agora)
    await m.reservas.pagarReserva(pix.id, agora)
    expect(await m.reservas.cancelarReserva(pix.id, agora)).toMatchObject({ status: 'CANCELADA', pago: true, estornoSolicitado: true })
    await expect(m.reservas.cancelarReserva('r-999')).rejects.toMatchObject({ status: 404 })
  })

  it('pagar duas vezes dá 409', async () => {
    const reserva = await m.reservas.criarReserva({ produtoId: 'p-pulse', quantidade: 1, formaPagamento: 'PIX' })
    await m.reservas.pagarReserva(reserva.id)
    await expect(m.reservas.pagarReserva(reserva.id)).rejects.toMatchObject({ status: 409 })
  })

  it('produto que não existe dá 404, no formato da API', async () => {
    await expect(
      m.reservas.criarReserva({ produtoId: 'nao-existe', quantidade: 1, formaPagamento: 'PIX' }),
    ).rejects.toMatchObject({ status: 404, erro: 'NAO_ENCONTRADO' })
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
      reservasAtivas: [
        {
          id: expect.any(String),
          produto: 'Tênis de corrida Pulse',
          status: 'PENDENTE',
          pago: false,
          expiraEm: expect.any(String),
          loja: { nome: 'Loja de esportes', piso: 1, mapaId: 'loja-esportes' },
        },
      ],
    })
    expect(carteira.cupons[0]).toMatchObject({
      id: 'cp1',
      titulo: '10% em calçados',
      loja: 'Loja de esportes',
      validade: '2026-12-31',
    })
  })
})

describe('mock da carteira: pontos e nível', () => {
  it('o nível sai dos pontos (RN08) e a compra soma pontos', async () => {
    expect(m.carteira.nivelDosPontos(499)).toBe('SEMENTE')
    expect(m.carteira.nivelDosPontos(500)).toBe('BROTO')
    expect(m.carteira.nivelDosPontos(5000)).toBe('DOURADO')
    expect(m.carteira.creditarPontos(393)).toBe(2533)
    expect(await m.carteira.obterCarteira()).toMatchObject({
      pontos: 2533,
      nivel: 'CAPIM',
      proximoNivel: { nivel: 'DOURADO', faltam: 2467 },
    })
  })

  it('no nível mais alto, não há próximo', async () => {
    m.carteira.creditarPontos(3000)
    expect(await m.carteira.obterCarteira()).toMatchObject({ pontos: 5140, nivel: 'DOURADO', proximoNivel: null })
  })
})

describe('mock da Capi', () => {
  it('a pergunta do roteiro tem a resposta salva, com reservar e rota', async () => {
    const resposta = await m.chat.enviarMensagem({ texto: m.chat.PERGUNTA_DEMO.texto })
    expect(resposta.resposta).toBe(
      'Achei dois parecidos aqui no térreo, os dois com o seu número.\n\n' +
        'O Pulse está nas últimas unidades. Quer que eu separe um para você?',
    )
    expect(resposta.produtos.map((p) => p.id)).toEqual(['p-pulse', 'p-run'])
    expect(resposta.acoes).toEqual([
      { tipo: 'RESERVAR', produtoId: 'p-pulse' },
      { tipo: 'ROTA', lojaId: 'l-esportes', mapaId: 'loja-esportes', piso: 1 },
    ])
  })

  it('outra mensagem vira busca, e sem resultado não inventa produto (RN14)', async () => {
    expect((await m.chat.enviarMensagem({ texto: 'perfume' })).produtos[0].id).toBe('p-perfume')
    expect((await m.chat.enviarMensagem({ texto: 'geladeira' })).produtos).toEqual([])
  })

  it('foto sem texto: até 3 produtos parecidos, RESERVAR no primeiro com estoque', async () => {
    const resposta = await m.chat.enviarMensagem({ texto: '', imagem: { tipo: 'image/jpeg', base64: 'AAAA' } })
    expect(resposta.produtos.length).toBeGreaterThan(0)
    expect(resposta.produtos.length).toBeLessThanOrEqual(3)
    expect(resposta.acoes[0]).toEqual({ tipo: 'RESERVAR', produtoId: resposta.produtos.find((p) => p.estoque > 0)?.id })
  })

  it('link: busca pelas palavras do endereço do produto', async () => {
    const achou = await m.chat.enviarMensagem({
      texto: '',
      link: 'https://outra-loja.com.br/perfume-amadeirado-100ml/p',
    })
    expect(achou.produtos.map((p) => p.id)).toEqual(['p-perfume'])
    const nada = await m.chat.enviarMensagem({ texto: '', link: 'https://outra-loja.com.br/geladeira-frost-free/p' })
    expect(nada).toEqual({ resposta: expect.any(String), produtos: [], acoes: [] })
  })

  it('confere a mensagem como o servidor: 400 DADOS_INVALIDOS', async () => {
    const foto = { tipo: 'image/jpeg' as const, base64: 'AAAA' }
    const invalidas = [
      { texto: '   ' },
      { texto: 'x'.repeat(1001) },
      { texto: '', imagem: foto, link: 'https://loja.com/a' },
      { texto: '', link: 'ftp://loja.com/a' },
      { texto: '', imagem: { tipo: 'image/heic' as 'image/jpeg', base64: 'AAAA' } },
      { texto: '', imagem: { ...foto, base64: 'A'.repeat(6 * 1024 * 1024) } },
    ]
    for (const mensagem of invalidas) {
      await expect(m.chat.enviarMensagem(mensagem)).rejects.toMatchObject({ status: 400, erro: 'DADOS_INVALIDOS' })
    }
  })
})
