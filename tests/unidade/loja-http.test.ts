import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErroApi, paraErroApi, requisitar } from '../../src/loja/api/http'
import { apagarSessao, gravarSessao, lerSessao, tokenVencido } from '../../src/loja/api/sessao'

function tokenCom(exp: number) {
  const payload = btoa(JSON.stringify({ sub: 'u1', perfil: 'LOJISTA', exp }))
  return `cabecalho.${payload}.assinatura`
}

const LOJISTA = { id: 'u1', nome: 'Equipe', perfil: 'LOJISTA' as const, lojaId: 'l1' }

afterEach(() => {
  vi.unstubAllGlobals()
  apagarSessao()
})

describe('requisitar', () => {
  it('vai para a API real quando a rota não está nos mocks, com o token', async () => {
    const fetch = vi.fn(async () => Response.json({ itens: [], total: 0 }))
    vi.stubGlobal('fetch', fetch)
    gravarSessao({ token: tokenCom(Date.now() / 1000 + 60), usuario: LOJISTA })

    const resposta = await requisitar('GET', '/api/teste/fora-dos-mocks', { busca: { pagina: 1, tamanho: undefined } })

    expect(resposta).toEqual({ itens: [], total: 0 })
    expect(fetch).toHaveBeenCalledWith('/api/teste/fora-dos-mocks?pagina=1', expect.objectContaining({ method: 'GET' }))
    const { headers } = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect((headers as Record<string, string>).Authorization).toMatch(/^Bearer /)
  })

  it('transforma o erro do contrato em ErroApi', async () => {
    vi.stubGlobal('fetch', async () =>
      Response.json({ status: 422, erro: 'CUPOM_INVALIDO', mensagem: 'Cupom vencido.' }, { status: 422 }),
    )
    const erro = await requisitar('POST', '/api/teste/fora-dos-mocks', { corpo: {} }).catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ErroApi)
    expect(erro).toMatchObject({ status: 422, erro: 'CUPOM_INVALIDO', mensagem: 'Cupom vencido.', passageiro: false })
  })

  it('apaga a sessão no 401', async () => {
    gravarSessao({ token: tokenCom(Date.now() / 1000 + 60), usuario: LOJISTA })
    vi.stubGlobal('fetch', async () =>
      Response.json({ status: 401, erro: 'NAO_AUTENTICADO', mensagem: 'Entre de novo.' }, { status: 401 }),
    )
    await requisitar('GET', '/api/teste/fora-dos-mocks').catch(() => {})
    expect(lerSessao()).toBeNull()
  })

  it('explica resposta fora do contrato e falta de conexão', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>502</html>', { status: 502 }))
    await expect(requisitar('GET', '/api/teste/fora-dos-mocks')).rejects.toMatchObject({
      erro: 'RESPOSTA_INVALIDA',
      passageiro: true,
    })

    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch')
    })
    await expect(requisitar('GET', '/api/teste/fora-dos-mocks')).rejects.toMatchObject({ status: 0, erro: 'SEM_CONEXAO' })
  })

  it('usa o mock quando a rota está na tabela, sem chamar a rede', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const resposta = await requisitar<{ usuario: { perfil: string } }>('POST', '/api/auth/login', {
      corpo: { email: 'lojista.loja-19@demo.test', senha: '12345678' },
    })
    expect(resposta.usuario.perfil).toBe('LOJISTA')
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('sessão', () => {
  it('considera vencido o token sem exp ou com exp no passado', () => {
    expect(tokenVencido(tokenCom(Date.now() / 1000 + 60))).toBe(false)
    expect(tokenVencido(tokenCom(Date.now() / 1000 - 1))).toBe(true)
    expect(tokenVencido('sem-pontos')).toBe(true)
  })

  it('não guarda sessão vencida', () => {
    gravarSessao({ token: tokenCom(Date.now() / 1000 - 1), usuario: LOJISTA })
    expect(lerSessao()).toBeNull()
  })
})

describe('paraErroApi', () => {
  it('dá uma mensagem para qualquer falha', () => {
    expect(paraErroApi(new Error('x'))).toMatchObject({ erro: 'ERRO_INESPERADO' })
    expect(paraErroApi(new TypeError('rede'))).toMatchObject({ erro: 'SEM_CONEXAO' })
  })
})
