import { sessaoDaLoja, sessaoDoShopping } from '../painel/api/sessoes'
import type { ContaDeDemonstracao, Perfil, RespostaLogin, Usuario } from '../tipos'
import { comoErroApi, requisitar } from './cliente'
import { usarMock } from './fonte'
import * as mock from './mocks/auth'
import { apagarSessao, lerSessao, salvarSessao } from './sessao'

/** Quem está usando o app, ou null antes do login. Nas telas, prefira useSessao(). */
export function usuarioAtual(): Usuario | null {
  return lerSessao()?.usuario ?? null
}

/**
 * O login é um só (/entrar): a sessão vai para o lugar do perfil do token. O cliente fica na
 * sessão do app; o lojista e a administração, na do painel deles (src/painel/api/sessoes.ts).
 */
function guardar(sessao: RespostaLogin): Usuario {
  if (sessao.usuario.perfil === 'LOJISTA') sessaoDaLoja.gravarSessao(sessao)
  else if (sessao.usuario.perfil === 'ADMIN_SHOPPING') sessaoDoShopping.gravarSessao(sessao)
  else salvarSessao(sessao)
  return sessao.usuario
}

/** POST /api/auth/login. Guarda o token do perfil para as próximas chamadas. */
export async function entrar(email: string, senha: string): Promise<Usuario> {
  const sessao = usarMock('auth')
    ? await mock.entrar(email, senha)
    : await requisitar<RespostaLogin>('POST', '/api/auth/login', { email, senha })
  return guardar(sessao)
}

/** GET /api/auth/demo: as contas de demonstração. Lista vazia com o modo demonstração desligado. */
export async function contasDeDemonstracao(): Promise<ContaDeDemonstracao[]> {
  if (usarMock('auth')) return mock.contasDeDemonstracao()
  try {
    return (await requisitar<{ contas: ContaDeDemonstracao[] }>('GET', '/api/auth/demo')).contas
  } catch (erro) {
    if (comoErroApi(erro).status === 404) return []
    throw erro
  }
}

/** POST /api/auth/demo: entra com a conta de demonstração do perfil, sem senha. */
export async function entrarComDemo(perfil: Perfil = 'CLIENTE'): Promise<Usuario> {
  const sessao = usarMock('auth')
    ? await mock.entrarComDemo(perfil)
    : await requisitar<RespostaLogin>('POST', '/api/auth/demo', { perfil })
  return guardar(sessao)
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
