// Os mocks do painel precisam responder como a API de docs/api.md: estes testes conferem o
// formato e as regras, para a troca pela API real não mudar nada nas telas.
import { beforeEach, describe, expect, it } from 'vitest'
import { reiniciarMocks, responderMock } from '../../src/mocks/loja'
import { QR_DA_ANA } from '../../src/loja/telas/atendimento/demo'
import type { Atendimento, Compra, Pagina, ReservaDaLoja, RespostaLogin } from '../../src/tipos/loja'

let token: string | null = null

async function chamar<T = unknown>(metodo: string, url: string, corpo?: unknown) {
  const resposta = await responderMock({
    metodo,
    url,
    corpo: corpo === undefined ? undefined : JSON.stringify(corpo),
    token,
  })
  if (!resposta) throw new Error(`${metodo} ${url} não está mockada`)
  return { status: resposta.status, corpo: (await resposta.json()) as T }
}

async function entrarComoLojista() {
  const { corpo } = await chamar<RespostaLogin>('POST', '/api/auth/login', {
    email: 'lojista.loja-19@demo.test',
    senha: 'qualquer-coisa',
  })
  token = corpo.token
}

beforeEach(async () => {
  reiniciarMocks()
  token = null
  await entrarComoLojista()
})

describe('mocks: login', () => {
  it('devolve token com exp de 12 horas e o usuário lojista', async () => {
    token = null
    const { status, corpo } = await chamar<RespostaLogin>('POST', '/api/auth/login', {
      email: 'lojista.loja-19@demo.test',
      senha: '12345678',
    })
    expect(status).toBe(200)
    expect(corpo.usuario).toMatchObject({ perfil: 'LOJISTA', lojaId: expect.any(String) })
    const payload = JSON.parse(atob(corpo.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    expect(payload.exp - payload.iat).toBe(12 * 60 * 60)
  })

  it('recusa com a mesma mensagem e-mail desconhecido e senha curta', async () => {
    const desconhecido = await chamar('POST', '/api/auth/login', { email: 'ana@email.com', senha: '12345678' })
    const senhaCurta = await chamar('POST', '/api/auth/login', { email: 'lojista.loja-19@demo.test', senha: '123' })
    expect(desconhecido).toEqual(senhaCurta)
    expect(desconhecido.corpo).toEqual({ status: 401, erro: 'NAO_AUTENTICADO', mensagem: expect.any(String) })
  })

  it('pede token nas rotas da loja', async () => {
    token = null
    const { status, corpo } = await chamar('GET', `/api/loja/atendimento/${QR_DA_ANA}`)
    expect(status).toBe(401)
    expect(corpo).toMatchObject({ erro: 'NAO_AUTENTICADO' })
  })
})

describe('mocks: GET /api/loja/atendimento/{qr}', () => {
  it('mostra a ficha só com as categorias da loja (RN04), as reservas e os cupons', async () => {
    const { status, corpo } = await chamar<Atendimento>('GET', `/api/loja/atendimento/${QR_DA_ANA}`)
    expect(status).toBe(200)
    expect(corpo.cliente).toEqual({ nome: 'Ana', nivel: 'CAPIM' })
    expect(corpo.ficha).toContain('Prefere preto')
    expect(corpo.ficha.join(' ')).not.toMatch(/perfume/i)
    expect(corpo.reservas).toEqual([{ id: 'r1', produto: 'Tênis de corrida Pulse', status: 'SEPARADA', pago: true }])
    expect(corpo.cupons).toEqual([
      { id: 'cp1', titulo: '10% em calçados', origem: 'LOJA' },
      { id: 'cp2', titulo: 'R$ 20 do shopping', origem: 'SHOPPING' },
      { id: 'cp3', titulo: 'R$ 15 em camisetas', origem: 'LOJA' },
    ])
  })

  it('devolve a ficha vazia sem consentimento', async () => {
    const { corpo } = await chamar<Atendimento>('GET', '/api/loja/atendimento/q-demo-bruno')
    expect(corpo.ficha).toEqual([])
  })

  it('responde 404 para QR desconhecido', async () => {
    const { status, corpo } = await chamar('GET', '/api/loja/atendimento/q-nao-existe')
    expect(status).toBe(404)
    expect(corpo).toMatchObject({ status: 404, erro: 'NAO_ENCONTRADO' })
  })
})

describe('mocks: POST /api/loja/compras', () => {
  it('reproduz o exemplo do contrato: 10% + R$ 20, 393 pontos e reembolso do voucher', async () => {
    const { status, corpo } = await chamar<Compra>('POST', '/api/loja/compras', {
      qrToken: QR_DA_ANA,
      valorCentavos: 45980,
      cupons: ['cp1', 'cp2'],
    })
    expect(status).toBe(201)
    expect(corpo).toEqual({
      id: expect.any(String),
      valorBrutoCentavos: 45980,
      descontos: [
        { cupom: 'cp1', centavos: 4598 },
        { cupom: 'cp2', centavos: 2000 },
      ],
      valorPagoCentavos: 39382,
      pontosGerados: 393,
      reembolsoGerado: { cupom: 'cp2', centavos: 2000 },
    })
  })

  it('não aceita dois cupons da mesma loja (RN05)', async () => {
    const { status, corpo } = await chamar('POST', '/api/loja/compras', {
      qrToken: QR_DA_ANA,
      valorCentavos: 10000,
      cupons: ['cp1', 'cp3'],
    })
    expect(status).toBe(422)
    expect(corpo).toMatchObject({ erro: 'CUPONS_INCOMPATIVEIS' })
  })

  it('recusa cupom vencido e cupom de nível acima do cliente (RN06)', async () => {
    const vencido = await chamar('POST', '/api/loja/compras', { qrToken: QR_DA_ANA, valorCentavos: 10000, cupons: ['cp4'] })
    expect(vencido.corpo).toMatchObject({ status: 422, erro: 'CUPOM_INVALIDO', mensagem: expect.stringMatching(/venceu/) })
    const dourado = await chamar('POST', '/api/loja/compras', { qrToken: QR_DA_ANA, valorCentavos: 10000, cupons: ['cp5'] })
    expect(dourado.corpo).toMatchObject({ status: 422, erro: 'CUPOM_INVALIDO', mensagem: expect.stringMatching(/DOURADO/) })
  })

  it('desconta o voucher do shopping sobre o que sobrou depois do cupom da loja', async () => {
    const { corpo } = await chamar<Compra>('POST', '/api/loja/compras', {
      qrToken: QR_DA_ANA,
      valorCentavos: 1800,
      cupons: ['cp2', 'cp3'],
    })
    // R$ 18,00 - R$ 15,00 da loja = R$ 3,00; o voucher de R$ 20 só cobre os R$ 3,00 que sobraram.
    expect(corpo.descontos).toEqual([
      { cupom: 'cp3', centavos: 1500 },
      { cupom: 'cp2', centavos: 300 },
    ])
    expect(corpo).toMatchObject({ valorPagoCentavos: 0, pontosGerados: 0, reembolsoGerado: { cupom: 'cp2', centavos: 300 } })
  })

  it('recusa cupom que o cliente não tem', async () => {
    const { status, corpo } = await chamar('POST', '/api/loja/compras', {
      qrToken: QR_DA_ANA,
      valorCentavos: 10000,
      cupons: ['cp-inexistente'],
    })
    expect(status).toBe(422)
    expect(corpo).toMatchObject({ erro: 'CUPOM_INVALIDO' })
  })

  it('não deixa usar o cupom de novo depois do limite (RN06)', async () => {
    await chamar('POST', '/api/loja/compras', { qrToken: QR_DA_ANA, valorCentavos: 10000, cupons: ['cp1'] })
    const segunda = await chamar('POST', '/api/loja/compras', { qrToken: QR_DA_ANA, valorCentavos: 10000, cupons: ['cp1'] })
    expect(segunda.status).toBe(422)
    const { corpo } = await chamar<Atendimento>('GET', `/api/loja/atendimento/${QR_DA_ANA}`)
    expect(corpo.cupons.map((c) => c.id)).toEqual(['cp2', 'cp3'])
  })

  it('retira a reserva paga com Pix pelo valor dela, sem cobrar de novo, e só uma vez', async () => {
    const retirada = await chamar<Compra>('POST', '/api/loja/compras', {
      qrToken: QR_DA_ANA,
      valorCentavos: 0,
      cupons: [],
      reservaId: 'r1',
    })
    expect(retirada.status).toBe(201)
    expect(retirada.corpo).toMatchObject({ valorBrutoCentavos: 39990, valorPagoCentavos: 39990, pontosGerados: 399 })

    const deNovo = await chamar('POST', '/api/loja/compras', {
      qrToken: QR_DA_ANA,
      valorCentavos: 0,
      cupons: [],
      reservaId: 'r1',
    })
    expect(deNovo.status).toBe(409)
    expect(deNovo.corpo).toMatchObject({ erro: 'TRANSICAO_INVALIDA' })
  })

  it('não retira reserva de outro cliente', async () => {
    const { status } = await chamar('POST', '/api/loja/compras', {
      qrToken: QR_DA_ANA,
      valorCentavos: 5990,
      cupons: [],
      reservaId: 'r3',
    })
    expect(status).toBe(404)
  })

  it('pede o valor da compra', async () => {
    const { status, corpo } = await chamar('POST', '/api/loja/compras', { qrToken: QR_DA_ANA, valorCentavos: 0, cupons: [] })
    expect(status).toBe(400)
    expect(corpo).toMatchObject({ erro: 'DADOS_INVALIDOS' })
  })
})

describe('mocks: POST /api/loja/atendimento/previa', () => {
  it('dá o total do protótipo antes de registrar, sem gravar nada', async () => {
    const pedido = { qrToken: QR_DA_ANA, valorCentavos: 45980, cupons: ['cp1', 'cp2'] }
    const { status, corpo } = await chamar('POST', '/api/loja/atendimento/previa', pedido)
    expect(status).toBe(200)
    expect(corpo).toEqual({
      valorBrutoCentavos: 45980,
      descontos: [
        { cupom: 'cp1', centavos: 4598 },
        { cupom: 'cp2', centavos: 2000 },
      ],
      valorPagoCentavos: 39382,
      pontosGerados: 393,
      reembolsoGerado: { cupom: 'cp2', centavos: 2000 },
    })
    // A prévia não gasta os cupons: a compra de verdade dá o mesmo resultado.
    const compra = await chamar<Compra>('POST', '/api/loja/compras', pedido)
    expect(compra.corpo).toEqual({ id: expect.any(String), ...(corpo as object) })
  })

  it('mostra a retirada paga com Pix pelo valor da reserva', async () => {
    const { corpo } = await chamar('POST', '/api/loja/atendimento/previa', {
      qrToken: QR_DA_ANA,
      valorCentavos: 0,
      cupons: [],
      reservaId: 'r1',
    })
    expect(corpo).toMatchObject({ valorPagoCentavos: 39990, pontosGerados: 399 })
  })

  it('responde com os mesmos erros da compra', async () => {
    const { status, corpo } = await chamar('POST', '/api/loja/atendimento/previa', {
      qrToken: QR_DA_ANA,
      valorCentavos: 10000,
      cupons: ['cp1', 'cp3'],
    })
    expect(status).toBe(422)
    expect(corpo).toMatchObject({ erro: 'CUPONS_INCOMPATIVEIS' })
  })
})

describe('mocks: reservas da loja', () => {
  it('lista as ativas paginadas, as que vencem primeiro no topo', async () => {
    const { status, corpo } = await chamar<Pagina<ReservaDaLoja>>(
      'GET',
      '/api/loja/reservas?status=PENDENTE,CONFIRMADA,SEPARADA&tamanho=3',
    )
    expect(status).toBe(200)
    expect(corpo.total).toBe(7)
    expect(corpo.itens).toHaveLength(3)
    const prazos = corpo.itens.map((r) => r.expiraEm)
    expect(prazos).toEqual([...prazos].sort())
    expect(corpo.itens[0]).not.toHaveProperty('clienteId')
  })

  it('muda o status seguindo o diagrama e recusa transição proibida com 409', async () => {
    const separar = await chamar<ReservaDaLoja>('PATCH', '/api/loja/reservas/r2', { status: 'SEPARADA' })
    expect(separar.status).toBe(200)
    expect(separar.corpo.status).toBe('SEPARADA')

    const voltar = await chamar('PATCH', '/api/loja/reservas/r2', { status: 'CONFIRMADA' })
    expect(voltar.status).toBe(409)
    expect(voltar.corpo).toMatchObject({ status: 409, erro: 'TRANSICAO_INVALIDA' })
  })
})

describe('mocks: rotas fora da tabela', () => {
  it('devolve null para o http.ts chamar a API real', async () => {
    expect(await responderMock({ metodo: 'GET', url: '/api/teste/fora-dos-mocks', token })).toBeNull()
    expect(await responderMock({ metodo: 'DELETE', url: '/api/loja/reservas/r1', token })).toBeNull()
  })
})
