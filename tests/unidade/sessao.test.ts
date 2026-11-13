// Login, conta de demonstração e o que o cliente HTTP faz com o token.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ANA = { id: 'u-ana', nome: 'Ana Souza', perfil: 'CLIENTE' as const, lojaId: null }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.doUnmock('../../src/api/fonte')
})

describe('login com o auth em mock', () => {
  let auth: typeof import('../../src/api/auth')
  let sessao: typeof import('../../src/api/sessao')
  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('../../src/api/fonte', () => ({ usarMock: () => true }))
    auth = await import('../../src/api/auth')
    sessao = await import('../../src/api/sessao')
  })

  it('e-mail da Ana com senha de 8 caracteres ou mais abre a sessão', async () => {
    expect(auth.usuarioAtual()).toBeNull()
    await expect(auth.entrar(' Ana.Souza@demo.test ', '12345678')).resolves.toEqual(ANA)
    expect(sessao.lerSessao()?.usuario).toEqual(ANA)
  })

  it('e-mail ou senha errados dão 401 com a mesma mensagem, sem sessão', async () => {
    const erro = { status: 401, erro: 'NAO_AUTENTICADO', mensagem: 'E-mail ou senha incorretos.' }
    await expect(auth.entrar('outra@demo.test', '12345678')).rejects.toMatchObject(erro)
    await expect(auth.entrar('ana.souza@demo.test', 'curta')).rejects.toMatchObject(erro)
    expect(auth.usuarioAtual()).toBeNull()
  })

  it('a conta de demonstração entra sem senha, e sair apaga a sessão', async () => {
    await expect(auth.entrarComDemo()).resolves.toEqual(ANA)
    auth.sair()
    expect(sessao.lerSessao()).toBeNull()
  })

  it('o token do mock não vai para a API real', async () => {
    const fetch = vi.fn(async () => Response.json({ itens: [], total: 0 }))
    vi.stubGlobal('fetch', fetch)
    await auth.entrarComDemo()
    const { requisitar } = await import('../../src/api/cliente')
    await requisitar('GET', '/api/produtos')
    expect(fetch.mock.calls[0]).toEqual([
      '/api/produtos',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    ])
  })
})

describe('com o auth na API real', () => {
  it('manda o token e, com 401, encerra a sessão', async () => {
    vi.resetModules()
    vi.doMock('../../src/api/fonte', () => ({ usarMock: () => false }))
    const sessao = await import('../../src/api/sessao')
    const { requisitar } = await import('../../src/api/cliente')
    const fetch = vi.fn(async () =>
      Response.json({ status: 401, erro: 'NAO_AUTENTICADO', mensagem: 'Sua sessão venceu.' }, { status: 401 }),
    )
    vi.stubGlobal('fetch', fetch)
    sessao.salvarSessao({ token: 'jwt-vencido', usuario: ANA })

    await expect(requisitar('GET', '/api/me/carteira')).rejects.toMatchObject({
      status: 401,
      mensagem: 'Sua sessão venceu.',
    })
    expect(fetch.mock.calls[0]).toEqual([
      '/api/me/carteira',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer jwt-vencido' }) }),
    ])
    expect(sessao.lerSessao()).toBeNull()
  })
})

describe('Minha conta: nome novo e arquivo dos dados', () => {
  beforeEach(() => vi.resetModules())

  it('mudarNome guarda o nome que a API devolveu na sessão, sem trocar o token', async () => {
    vi.doMock('../../src/api/fonte', () => ({ usarMock: () => false }))
    const sessao = await import('../../src/api/sessao')
    const conta = await import('../../src/api/conta')
    sessao.salvarSessao({ token: 't-1', usuario: ANA })
    const pedidos: { metodo: string; corpo: unknown }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        pedidos.push({ metodo: String(init.method), corpo: JSON.parse(String(init.body)) })
        return Response.json({ id: 'u-ana', nome: 'Ana Lima', email: 'a@a.test', nivel: 'SEMENTE', pontos: 0, compartilharFicha: false })
      }),
    )
    await conta.mudarNome('  Ana Lima ')
    expect(pedidos).toEqual([{ metodo: 'PATCH', corpo: { nome: '  Ana Lima ' } }])
    expect(sessao.lerSessao()).toEqual({ token: 't-1', usuario: { ...ANA, nome: 'Ana Lima' } })
  })

  it('sem sessão, mudar o nome na sessão não cria uma', async () => {
    const sessao = await import('../../src/api/sessao')
    sessao.apagarSessao()
    sessao.mudarNomeNaSessao('Outra')
    expect(sessao.lerSessao()).toBeNull()
  })

  it('o arquivo dos dados leva a data em que foi gerado', async () => {
    const { nomeDoArquivoDeDados } = await import('../../src/app/arquivo')
    expect(nomeDoArquivoDeDados('2026-11-13T15:10:00.000Z')).toBe('meus-dados-2026-11-13.json')
  })
})
