import { beforeEach, describe, expect, it } from 'vitest'
import { reiniciarMocks, responderMock } from '../../src/mocks/shopping'
import type { Demanda, RespostaLogin } from '../../src/tipos/shopping'

let token: string | null = null

async function chamar<T = unknown>(metodo: string, url: string, corpo?: unknown) {
  const resposta = await responderMock({ metodo, url, corpo: corpo === undefined ? undefined : JSON.stringify(corpo), token })
  if (!resposta) throw new Error(`${metodo} ${url} não está mockada`)
  return { status: resposta.status, corpo: (await resposta.json()) as T }
}

beforeEach(async () => {
  reiniciarMocks()
  token = null
  token = (await chamar<RespostaLogin>('POST', '/api/auth/login', { email: 'admin@demo.test', senha: '12345678' })).corpo.token
})

describe('mocks do shopping: GET /api/shopping/demanda', () => {
  it('soma as buscas sem resultado por categoria, da que mais falta para a que menos falta', async () => {
    const { status, corpo } = await chamar<Demanda>('GET', '/api/shopping/demanda?periodo=30d')
    expect(status).toBe(200)
    const categorias = corpo.semResultadoPorCategoria
    expect(categorias[0]).toMatchObject({ categoria: 'eletronicos', buscas: 269 })
    expect(categorias.map((c) => c.buscas)).toEqual([...categorias.map((c) => c.buscas)].sort((a, b) => b - a))
    expect(corpo.semResultado).toBe(categorias.reduce((s, c) => s + c.buscas, 0))
    expect(corpo.semResultado).toBe(1412)
    // O mesmo número do Desempenho da Loja de esportes.
    expect(categorias.find((c) => c.categoria === 'calcados')?.termos[0]).toEqual({ termo: 'tênis de trilha', buscas: 120 })
    // Nenhum dado de cliente (RN12).
    expect(JSON.stringify(corpo)).not.toMatch(/cliente/i)
  })

  it('muda com o período e recusa período desconhecido', async () => {
    const sete = await chamar<Demanda>('GET', '/api/shopping/demanda?periodo=7d')
    const noventa = await chamar<Demanda>('GET', '/api/shopping/demanda?periodo=90d')
    expect(sete.corpo.semResultado).toBeLessThan(noventa.corpo.semResultado)
    expect((await chamar('GET', '/api/shopping/demanda?periodo=1a')).status).toBe(400)
  })
})
