import { beforeEach, describe, expect, it } from 'vitest'
import { reiniciarMocks, responderMock } from '../../src/mocks/shopping'
import type { LojaDoShopping, LojistaCriado, LojistaDaLoja, Lista, PedidoLoja, RespostaLogin } from '../../src/tipos/shopping'

let token: string | null = null

async function chamar<T = unknown>(metodo: string, url: string, corpo?: unknown) {
  const resposta = await responderMock({ metodo, url, corpo: corpo === undefined ? undefined : JSON.stringify(corpo), token })
  if (!resposta) throw new Error(`${metodo} ${url} não está mockada`)
  return { status: resposta.status, corpo: (await resposta.json()) as T }
}

beforeEach(async () => {
  reiniciarMocks()
  token = null
  const { corpo } = await chamar<RespostaLogin>('POST', '/api/auth/login', { email: 'admin@demo.test', senha: '12345678' })
  token = corpo.token
})

const OCUPAR: PedidoLoja = { nome: 'Eletrônicos do Cerrado', cnpj: '12.345.678/0001-90', tipo: 'loja', categorias: ['eletronicos'], ativa: true }

describe('mocks do shopping: login', () => {
  it('só o administrador entra; lojista não', async () => {
    token = null
    const admin = await chamar<RespostaLogin>('POST', '/api/auth/login', { email: 'admin@demo.test', senha: '12345678' })
    expect(admin.corpo.usuario.perfil).toBe('ADMIN_SHOPPING')
    const lojista = await chamar('POST', '/api/auth/login', { email: 'lojista.loja-19@demo.test', senha: '12345678' })
    expect(lojista.status).toBe(401)
  })

  it('pede o token de admin nas rotas do shopping', async () => {
    token = null
    const { status } = await chamar('GET', '/api/shopping/lojas')
    expect(status).toBe(401)
  })
})

describe('mocks do shopping: lojas e lojistas', () => {
  it('lista as unidades com as 13 vagas da planta', async () => {
    const todas = await chamar<Lista<LojaDoShopping>>('GET', '/api/shopping/lojas?tamanho=200')
    expect(todas.corpo.total).toBe(34)
    const vagas = await chamar<Lista<LojaDoShopping>>('GET', '/api/shopping/lojas?situacao=VAGA&tamanho=200')
    expect(vagas.corpo.total).toBe(13)
    expect(vagas.corpo.itens.find((l) => l.mapaId === 'loja-47')).toMatchObject({ unidade: 'LOJA 47', areaM2: 229.9, cnpj: null, lojistas: 0 })
    const busca = await chamar<Lista<LojaDoShopping>>('GET', '/api/shopping/lojas?q=esportes')
    expect(busca.corpo.itens[0]).toMatchObject({ nome: 'Loja de esportes', unidade: 'LOJA 19', lojistas: 1 })
  })

  it('ocupa uma vaga, cadastra o lojista com senha provisória e libera a unidade de novo', async () => {
    const ocupada = await chamar<LojaDoShopping>('PUT', '/api/shopping/lojas/loja-47', OCUPAR)
    expect(ocupada.corpo).toMatchObject({ nome: 'Eletrônicos do Cerrado', cnpj: '12345678000190', ativa: true })

    const lojista = await chamar<LojistaCriado>('POST', '/api/shopping/lojistas', {
      lojaId: 'loja-47',
      nome: 'Equipe de eletrônicos',
      email: 'eletronicos@demo.test',
    })
    expect(lojista.status).toBe(201)
    expect(lojista.corpo.senhaProvisoria).toMatch(/^[a-z0-9]{10}$/)
    const repetido = await chamar('POST', '/api/shopping/lojistas', { lojaId: 'loja-47', nome: 'Outro', email: 'eletronicos@demo.test' })
    expect(repetido.corpo).toMatchObject({ status: 409, erro: 'EMAIL_EM_USO' })

    const liberada = await chamar<LojaDoShopping>('PUT', '/api/shopping/lojas/loja-47', { ...OCUPAR, ativa: false })
    expect(liberada.corpo).toMatchObject({ nome: 'Vaga', cnpj: null, ativa: false, lojistas: 0 })
    const semAcesso = await chamar<LojistaDaLoja[]>('GET', '/api/shopping/lojas/loja-47/lojistas')
    expect(semAcesso.corpo).toEqual([])
  })

  it('recusa loja sem CNPJ, CNPJ repetido e lojista em unidade vaga', async () => {
    const semCnpj = await chamar('PUT', '/api/shopping/lojas/loja-47', { ...OCUPAR, cnpj: '123' })
    expect(semCnpj.status).toBe(400)
    const repetido = await chamar('PUT', '/api/shopping/lojas/loja-47', { ...OCUPAR, cnpj: '11222333000101' })
    expect(repetido.corpo).toMatchObject({ status: 409, erro: 'CNPJ_EM_USO' })
    const naVaga = await chamar('POST', '/api/shopping/lojistas', { lojaId: 'loja-141', nome: 'Alguém', email: 'a@demo.test' })
    expect(naVaga.corpo).toMatchObject({ status: 422, erro: 'LOJA_VAGA' })
  })
})
