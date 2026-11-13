// Os mocks que sobraram no painel da loja (produtos, cupons e relatórios, enquanto a API não
// tem essas rotas) aceitam o token real e só eles respondem: o resto vai para a API.
import { beforeEach, describe, expect, it } from 'vitest'
import { criarTokenFalso } from '../../src/mocks/comum/token'
import { reiniciarMocks, responderMock } from '../../src/mocks/loja'

beforeEach(() => reiniciarMocks())

const lojista = () => criarTokenFalso({ sub: 'l-pc01a', perfil: 'LOJISTA', lojaId: 'loja-pc01a' })

describe('mocks da loja: token', () => {
  it('pedem o token do lojista', async () => {
    const sem = await responderMock({ metodo: 'GET', url: '/api/loja/produtos', token: null })
    expect(sem?.status).toBe(401)
    const admin = await responderMock({ metodo: 'GET', url: '/api/loja/produtos', token: criarTokenFalso({ sub: 'a', perfil: 'ADMIN_SHOPPING', lojaId: null }) })
    expect(admin?.status).toBe(403)
    expect((await responderMock({ metodo: 'GET', url: '/api/loja/produtos', token: lojista() }))?.status).toBe(200)
  })
})

describe('mocks da loja: o que vai para a API real', () => {
  it('devolve null nas rotas que a API já tem, para o http.ts chamar a API', async () => {
    const token = lojista()
    for (const [metodo, url] of [
      ['POST', '/api/auth/login'],
      ['GET', '/api/loja/atendimento/q-ana'],
      ['POST', '/api/loja/compras/previa'],
      ['POST', '/api/loja/compras'],
      ['GET', '/api/loja/reservas'],
      ['PATCH', '/api/loja/reservas/r1'],
      ['GET', '/api/loja/extrato'],
      ['GET', '/api/teste/fora-dos-mocks'],
    ]) {
      expect(await responderMock({ metodo, url, token }), `${metodo} ${url}`).toBeNull()
    }
  })
})
