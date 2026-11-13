// Rotas do painel do shopping (RF27 a RF29), no formato dos mocks da fase-4 (docs/api.md).
// tests/seed.sql tem 3 lojas ativas e 4 vagas (uma sem área).
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { onRequestGet as atendimento } from '../../functions/api/loja/atendimento/[qr]'
import { onRequestPost as compras } from '../../functions/api/loja/compras/index'
import { onRequestPost as login } from '../../functions/api/auth/login'
import { onRequestGet as configuracao, onRequestPut as salvarConfiguracao } from '../../functions/api/shopping/configuracao'
import { onRequestGet as vouchers, onRequestPost as criarVoucher } from '../../functions/api/shopping/cupons'
import { onRequestGet as demanda } from '../../functions/api/shopping/demanda'
import { onRequestPut as salvarLoja } from '../../functions/api/shopping/lojas/[id]/index'
import { onRequestGet as lojistasDaLoja } from '../../functions/api/shopping/lojas/[id]/lojistas'
import { onRequestGet as lojas, onRequestPost as criarUnidade } from '../../functions/api/shopping/lojas/index'
import { onRequestPost as criarLojista } from '../../functions/api/shopping/lojistas'
import { onRequestGet as vagas } from '../../functions/api/shopping/vagas'
import { ADMIN, chamar, LOJISTA_A } from '../workers/rotas'

const listar = (busca = '') => chamar(lojas, { url: `/api/shopping/lojas${busca}`, usuario: ADMIN })
const salvar = (id: string, corpo: unknown) =>
  chamar(salvarLoja, { metodo: 'PUT', url: `/api/shopping/lojas/${id}`, params: { id }, corpo, usuario: ADMIN })
const ocupar = { nome: 'Eletrônicos do Cerrado', cnpj: '12.345.678/0001-90', tipo: 'loja', categorias: ['eletronicos'], ativa: true }

/** quantas buscas iguais, há tantos dias. */
async function buscas(termo: string, categoria: string | null, encontrou: 0 | 1, quantas: number, dias = 1) {
  const sql = env.DB.prepare(
    "INSERT INTO busca (id, termo, categoria, encontrou, criado_em) VALUES (?1, ?2, ?3, ?4, datetime('now', ?5))",
  )
  await env.DB.batch(
    Array.from({ length: quantas }, (_, i) => sql.bind(`b-${termo}-${dias}-${i}`, termo, categoria, encontrou, `-${dias} days`)),
  )
}

/** A demanda dos testes: 170 buscas sem resultado em 30 dias nas categorias do shopping. */
async function demandaDeTeste() {
  await buscas('fone bluetooth', 'eletronicos', 0, 60)
  await buscas(' Fone Bluetooth ', 'eletronicos', 0, 10, 2) // o mesmo termo, contado junto
  await buscas('carregador turbo', 'eletronicos', 0, 30)
  await buscas('açaí', 'alimentacao', 0, 40)
  await buscas('bicicleta', 'esportes', 0, 30)
  await buscas('xyz', 'categoria-inventada', 0, 50) // fora das categorias do shopping
  await buscas('tênis de corrida', 'calcados', 1, 80)
  await buscas('smartwatch', 'eletronicos', 0, 5, 45) // só entra em 90 dias
}

describe('painel do shopping: acesso', () => {
  it('TA05: lojista no painel do shopping é 403; sem token, 401', async () => {
    expect((await chamar(lojas, { url: '/api/shopping/lojas', usuario: LOJISTA_A })).status).toBe(403)
    expect((await chamar(lojas, { url: '/api/shopping/lojas' })).status).toBe(401)
  })
})

describe('GET /api/shopping/lojas', () => {
  it('lista as unidades da planta, ativas e vagas, do térreo para o 2º piso pelo número', async () => {
    const r = await listar()
    expect(r.status).toBe(200)
    expect(r.corpo.total).toBe(7)
    expect(r.corpo.itens.map((l: { unidade: string }) => l.unidade)).toEqual([
      'LOJA 10', 'LOJA 11', 'LOJA 47', 'LOJA 99', 'LOJA 143', 'LOJA 201', 'LOJA 203',
    ])
    expect(r.corpo.itens[0]).toEqual({
      id: 'loja-a',
      nome: 'Loja A',
      unidade: 'LOJA 10',
      piso: 1,
      areaM2: 102,
      tipo: 'loja',
      categorias: ['calcados', 'roupas'],
      mapaId: 'mapa-loja-a',
      cnpj: '11111111000191',
      ativa: true,
      lojistas: 1,
    })
    expect(r.corpo.itens[2]).toMatchObject({ nome: 'Vaga', unidade: 'LOJA 47', areaM2: 229.9, cnpj: null, ativa: false, lojistas: 0 })
  })

  it('filtra por situação e por texto no nome ou na unidade, sem acento', async () => {
    expect((await listar('?situacao=VAGA')).corpo.total).toBe(4)
    expect((await listar('?situacao=ATIVA')).corpo.total).toBe(3)
    expect((await listar('?q=restaurante')).corpo.itens.map((l: { id: string }) => l.id)).toEqual(['restaurante-c'])
    expect((await listar('?q=loja%20143')).corpo.itens.map((l: { id: string }) => l.id)).toEqual(['vaga-143'])
    const pagina = await listar('?tamanho=2&pagina=2')
    expect(pagina.corpo).toMatchObject({ total: 7, itens: [{ unidade: 'LOJA 47' }, { unidade: 'LOJA 99' }] })
    expect((await listar('?situacao=FECHADA')).status).toBe(400)
  })
})

describe('PUT /api/shopping/lojas/{id}', () => {
  it('ocupa a vaga: a loja entra com nome, CNPJ (sem pontuação) e categorias', async () => {
    const r = await salvar('vaga-47', ocupar)
    expect(r.status).toBe(200)
    expect(r.corpo).toMatchObject({ id: 'vaga-47', nome: 'Eletrônicos do Cerrado', cnpj: '12345678000190', categorias: ['eletronicos'], ativa: true })
    expect((await listar('?situacao=VAGA')).corpo.total).toBe(3)
  })

  it('libera a unidade: vira vaga sem CNPJ, os lojistas perdem o acesso e os produtos somem do app', async () => {
    const r = await salvar('loja-a', { ativa: false })
    expect(r.corpo).toMatchObject({ nome: 'Vaga', cnpj: null, categorias: [], ativa: false, lojistas: 0 })
    expect(await env.DB.prepare("SELECT count(*) AS n FROM usuario WHERE id = 'l-a'").first()).toEqual({ n: 0 })
    const ativos = await env.DB.prepare(
      "SELECT count(*) AS n FROM produto p JOIN loja l ON l.id = p.loja_id WHERE p.ativo = 1 AND l.ativa = 1 AND l.id = 'loja-a'",
    ).first()
    expect(ativos).toEqual({ n: 0 })
  })

  it('CNPJ de outra loja é 409; dados errados, 400; unidade que não existe, 404', async () => {
    const repetido = await salvar('vaga-47', { ...ocupar, cnpj: '22222222000191' })
    expect(repetido.status).toBe(409)
    expect(repetido.corpo.erro).toBe('CNPJ_EM_USO')
    expect((await salvar('vaga-47', { ...ocupar, cnpj: '123' })).status).toBe(400)
    expect((await salvar('vaga-47', { ...ocupar, nome: 'Vaga' })).status).toBe(400)
    expect((await salvar('vaga-47', { ...ocupar, categorias: ['naves'] })).status).toBe(400)
    expect((await salvar('nao-existe', ocupar)).status).toBe(404)
  })
})

describe('POST /api/shopping/lojas', () => {
  it('cria uma unidade nova na planta; a repetida é 400', async () => {
    const corpo = { unidade: 'LOJA 150', piso: 1, areaM2: 80, mapaId: 'loja-150', ativa: false }
    const r = await chamar(criarUnidade, { metodo: 'POST', url: '/api/shopping/lojas', corpo, usuario: ADMIN })
    expect(r.status).toBe(201)
    expect(r.corpo).toMatchObject({ unidade: 'LOJA 150', piso: 1, areaM2: 80, nome: 'Vaga', ativa: false })
    const deNovo = await chamar(criarUnidade, { metodo: 'POST', url: '/api/shopping/lojas', corpo, usuario: ADMIN })
    expect(deNovo.status).toBe(400)
  })
})

describe('lojistas', () => {
  it('cria o acesso com senha provisória, que abre o painel da loja', async () => {
    const corpo = { lojaId: 'loja-b', nome: 'Equipe da perfumaria', email: 'Perfumaria@Teste.test' }
    const r = await chamar(criarLojista, { metodo: 'POST', url: '/api/shopping/lojistas', corpo, usuario: ADMIN })
    expect(r.status).toBe(201)
    expect(r.corpo).toMatchObject({ nome: 'Equipe da perfumaria', email: 'perfumaria@teste.test', lojaId: 'loja-b' })
    expect(r.corpo.senhaProvisoria).toMatch(/^[a-z2-9]{10}$/)

    const entrou = await chamar(login, {
      metodo: 'POST',
      url: '/api/auth/login',
      corpo: { email: 'perfumaria@teste.test', senha: r.corpo.senhaProvisoria },
    })
    expect(entrou.status).toBe(200)
    expect(entrou.corpo.usuario).toMatchObject({ perfil: 'LOJISTA', lojaId: 'loja-b' })

    const lista = await chamar(lojistasDaLoja, { url: '/api/shopping/lojas/loja-b/lojistas', params: { id: 'loja-b' }, usuario: ADMIN })
    expect(lista.corpo.map((l: { email: string }) => l.email)).toEqual(['lojista.b@teste.test', 'perfumaria@teste.test'])
  })

  it('unidade vaga é 422; e-mail que já tem conta, 409', async () => {
    const vaga = await chamar(criarLojista, {
      metodo: 'POST',
      url: '/api/shopping/lojistas',
      corpo: { lojaId: 'vaga-47', nome: 'Equipe nova', email: 'nova@teste.test' },
      usuario: ADMIN,
    })
    expect(vaga.status).toBe(422)
    expect(vaga.corpo.erro).toBe('LOJA_VAGA')
    const repetido = await chamar(criarLojista, {
      metodo: 'POST',
      url: '/api/shopping/lojistas',
      corpo: { lojaId: 'loja-b', nome: 'Outra Ana', email: 'ANA@teste.test' },
      usuario: ADMIN,
    })
    expect(repetido.status).toBe(409)
    expect(repetido.corpo.erro).toBe('EMAIL_EM_USO')
  })
})

describe('GET e PUT /api/shopping/configuracao', () => {
  const regras = { niveis: { SEMENTE: 0, BROTO: 300, CAPIM: 1500, DOURADO: 4000 }, pontosPorReal: 2, prazoReservaHoras: { NA_LOJA: 6, PIX: 24 } }

  it('lê as regras da migration e grava as novas, que o caixa passa a usar', async () => {
    const antes = await chamar(configuracao, { url: '/api/shopping/configuracao', usuario: ADMIN })
    expect(antes.corpo).toEqual({
      niveis: { SEMENTE: 0, BROTO: 500, CAPIM: 2000, DOURADO: 5000 },
      pontosPorReal: 1,
      prazoReservaHoras: { NA_LOJA: 4, PIX: 48 },
    })
    const r = await chamar(salvarConfiguracao, { metodo: 'PUT', url: '/api/shopping/configuracao', corpo: regras, usuario: ADMIN })
    expect(r.status).toBe(200)
    expect((await chamar(configuracao, { url: '/api/shopping/configuracao', usuario: ADMIN })).corpo).toEqual(regras)

    const compra = await chamar(compras, {
      metodo: 'POST',
      url: '/api/loja/compras',
      corpo: { qrToken: 'q-bruno', valorCentavos: 10000, cupons: [] },
      usuario: LOJISTA_A,
    })
    expect(compra.corpo.pontosGerados).toBe(200)
  })

  it('recusa níveis fora de ordem e prazos fora da faixa', async () => {
    const fora = (corpo: unknown) => chamar(salvarConfiguracao, { metodo: 'PUT', url: '/api/shopping/configuracao', corpo, usuario: ADMIN })
    const niveis = await fora({ ...regras, niveis: { ...regras.niveis, CAPIM: 200 } })
    expect(niveis.status).toBe(400)
    expect(niveis.corpo.mensagem).toBe('Cada nível precisa de mais pontos que o anterior.')
    expect((await fora({ ...regras, pontosPorReal: 0 })).status).toBe(400)
    expect((await fora({ ...regras, prazoReservaHoras: { NA_LOJA: 30, PIX: 24 } })).status).toBe(400)
  })
})

describe('GET e POST /api/shopping/cupons', () => {
  it('lista só os vouchers do shopping, com o uso', async () => {
    await chamar(compras, {
      metodo: 'POST',
      url: '/api/loja/compras',
      corpo: { qrToken: 'q-ana', valorCentavos: 45980, cupons: ['cp-shopping-20'] },
      usuario: LOJISTA_A,
    })
    const r = await chamar(vouchers, { url: '/api/shopping/cupons', usuario: ADMIN })
    expect(r.corpo).toEqual({
      itens: [
        {
          id: 'cp-shopping-20',
          titulo: 'R$ 20 em qualquer loja',
          tipo: 'VALOR',
          valor: 2000,
          categoriaAlvo: null,
          nivelMinimo: 'SEMENTE',
          limitePorCliente: 1,
          validade: '2099-12-31',
          ativo: true,
          usos: 1,
          descontoCentavos: 2000,
        },
      ],
      total: 1,
    })
  })

  it('o voucher criado já vale no atendimento das lojas', async () => {
    const corpo = { titulo: 'R$ 10 de boas-vindas', tipo: 'VALOR', valor: 1000, categoriaAlvo: null, nivelMinimo: 'SEMENTE', limitePorCliente: 1, validade: '2099-12-31' }
    const r = await chamar(criarVoucher, { metodo: 'POST', url: '/api/shopping/cupons', corpo, usuario: ADMIN })
    expect(r.status).toBe(201)
    expect(r.corpo).toMatchObject({ ...corpo, ativo: true, usos: 0, descontoCentavos: 0 })
    const balcao = await chamar(atendimento, { url: '/api/loja/atendimento/q-ana', params: { qr: 'q-ana' }, usuario: LOJISTA_A })
    expect(balcao.corpo.cupons).toContainEqual({ id: r.corpo.id, titulo: 'R$ 10 de boas-vindas', origem: 'SHOPPING' })

    const vencido = await chamar(criarVoucher, { metodo: 'POST', url: '/api/shopping/cupons', corpo: { ...corpo, validade: '2020-01-01' }, usuario: ADMIN })
    expect(vencido.status).toBe(400)
    const brinde = await chamar(criarVoucher, { metodo: 'POST', url: '/api/shopping/cupons', corpo: { ...corpo, tipo: 'BRINDE' }, usuario: ADMIN })
    expect(brinde.corpo.mensagem).toBe('Cupom de brinde não tem valor de desconto.')
  })
})

describe('GET /api/shopping/demanda', () => {
  it('conta as buscas do período, os termos sem diferença de maiúsculas e só as categorias do shopping', async () => {
    await demandaDeTeste()
    const r = await chamar(demanda, { url: '/api/shopping/demanda?periodo=30d', usuario: ADMIN })
    expect(r.status).toBe(200)
    expect(r.corpo).toEqual({
      periodo: '30d',
      buscas: 300,
      semResultado: 170,
      maisBuscados: [
        { termo: 'tênis de corrida', buscas: 80 },
        { termo: 'fone bluetooth', buscas: 70 },
        { termo: 'xyz', buscas: 50 },
        { termo: 'açaí', buscas: 40 },
        { termo: 'bicicleta', buscas: 30 },
        { termo: 'carregador turbo', buscas: 30 },
      ],
      semResultadoPorCategoria: [
        { categoria: 'eletronicos', buscas: 100, termos: [{ termo: 'fone bluetooth', buscas: 70 }, { termo: 'carregador turbo', buscas: 30 }] },
        { categoria: 'alimentacao', buscas: 40, termos: [{ termo: 'açaí', buscas: 40 }] },
        { categoria: 'esportes', buscas: 30, termos: [{ termo: 'bicicleta', buscas: 30 }] },
      ],
    })
    const noventa = await chamar(demanda, { url: '/api/shopping/demanda?periodo=90d', usuario: ADMIN })
    expect(noventa.corpo.semResultadoPorCategoria[0]).toMatchObject({ categoria: 'eletronicos', buscas: 105 })
    expect((await chamar(demanda, { url: '/api/shopping/demanda?periodo=1ano', usuario: ADMIN })).status).toBe(400)
  })
})

describe('GET /api/shopping/vagas', () => {
  it('cruza a demanda com as vagas que têm área: que loja buscar para cada uma', async () => {
    await demandaDeTeste()
    const r = await chamar(vagas, { url: '/api/shopping/vagas?periodo=30d', usuario: ADMIN })
    expect(r.status).toBe(200)
    expect(r.corpo.resumo).toEqual({ vagas: 3, areaTotalM2: 404.81, buscasSemResultado: 170, buscasComVaga: 170 })
    const sugestoes = r.corpo.vagas.map((v: { unidade: string; sugestao: { categoria: string; encaixe: string } | null }) => [
      v.unidade,
      v.sugestao?.categoria,
      v.sugestao?.encaixe,
    ])
    // Eletrônicos fica com a de 116 m² (perto do meio da faixa) e deixa a de 230 m² para esportes.
    expect(sugestoes).toEqual([
      ['LOJA 143', 'eletronicos', 'IDEAL'],
      ['LOJA 203', 'alimentacao', 'IDEAL'],
      ['LOJA 47', 'esportes', 'IDEAL'],
    ])
    expect(r.corpo.vagas[0].sugestao.motivo).toBe('A unidade serve: 116,1 m² é o tamanho típico de Eletrônicos (60 a 250 m²).')
    expect(r.corpo.vagas[1].sugestao.motivo).toMatch(/Fica na praça de alimentação\.$/)
  })

  it('a vaga ocupada sai do cruzamento na hora', async () => {
    await demandaDeTeste()
    await salvar('vaga-143', ocupar)
    const r = await chamar(vagas, { url: '/api/shopping/vagas', usuario: ADMIN })
    expect(r.corpo.vagas.map((v: { unidade: string; sugestao: { categoria: string } }) => [v.unidade, v.sugestao.categoria])).toEqual([
      ['LOJA 47', 'eletronicos'],
      ['LOJA 203', 'alimentacao'],
    ])
    const esportes = r.corpo.demanda.find((d: { categoria: string }) => d.categoria === 'esportes')
    expect(esportes).toMatchObject({ vagas: [], motivoSemVaga: 'As vagas do tamanho certo ficaram com categorias mais procuradas.' })
  })
})
