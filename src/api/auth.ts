import type { RespostaLogin, Usuario } from '../tipos'
import { requisitar } from './cliente'
import { usarMock } from './fonte'
import * as mock from './mocks/auth'
import { apagarSessao, lerSessao, salvarSessao } from './sessao'

/** Quem está usando o app, ou null antes do login. Nas telas, prefira useSessao(). */
export function usuarioAtual(): Usuario | null {
  return lerSessao()?.usuario ?? null
}

/** POST /api/auth/login. Guarda o token para as próximas chamadas. */
export async function entrar(email: string, senha: string): Promise<Usuario> {
  const sessao = usarMock('auth')
    ? await mock.entrar(email, senha)
    : await requisitar<RespostaLogin>('POST', '/api/auth/login', { email, senha })
  salvarSessao(sessao)
  return sessao.usuario
}

/** POST /api/auth/demo: entra com a conta de demonstração (a Ana), sem senha. */
export async function entrarComDemo(): Promise<Usuario> {
  const sessao = usarMock('auth')
    ? await mock.entrarComDemo()
    : await requisitar<RespostaLogin>('POST', '/api/auth/demo')
  salvarSessao(sessao)
  return sessao.usuario
}

/** POST /api/auth/cadastro: cria a conta de cliente e já entra com ela. */
export async function cadastrar(dados: { nome: string; email: string; senha: string; consentimentoFicha: boolean }): Promise<Usuario> {
  const sessao = usarMock('auth')
    ? await mock.cadastrar(dados.nome)
    : await requisitar<RespostaLogin>('POST', '/api/auth/cadastro', dados)
  salvarSessao(sessao)
  return sessao.usuario
}

export function sair() {
  apagarSessao()
}
