import type { RespostaLogin, Usuario } from '../tipos'
import { requisitar } from './cliente'
import { usarMock } from './fonte'
import * as mock from './mocks/auth'
import { apagarSessao, lerSessao, salvarSessao } from './sessao'

/** Quem está usando o app. Com o login em mock, é a Ana, cliente de teste. */
export function usuarioAtual(): Usuario | null {
  return lerSessao()?.usuario ?? (usarMock('auth') ? mock.SESSAO_DEMO.usuario : null)
}

/** POST /api/auth/login. Guarda o token para as próximas chamadas. */
export async function entrar(email: string, senha: string): Promise<Usuario> {
  const sessao = usarMock('auth')
    ? await mock.entrar()
    : await requisitar<RespostaLogin>('POST', '/api/auth/login', { email, senha })
  salvarSessao(sessao)
  return sessao.usuario
}

export function sair() {
  apagarSessao()
}
