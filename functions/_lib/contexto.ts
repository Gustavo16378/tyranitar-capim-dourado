// Tipos das rotas e a checagem de perfil.
import type { Perfil, UsuarioSessao } from './auth/jwt'
import { ErroApi } from './erros'

/** O que o _middleware deixa em context.data. */
export interface Dados extends Record<string, unknown> {
  usuario?: UsuarioSessao
}

/** Tipo de toda rota: export const onRequestGet: Rota = async ({ request, env, data }) => ... */
export type Rota<Params extends string = string> = PagesFunction<Env, Params, Dados>

/** O usuário logado, se o perfil dele for um dos pedidos. Sem login: 401; outro perfil: 403. */
export function exigirPerfil(dados: Dados, ...perfis: Perfil[]): UsuarioSessao {
  const usuario = dados.usuario
  if (!usuario) throw new ErroApi('NAO_AUTENTICADO', 'Entre na sua conta para continuar.')
  if (!perfis.includes(usuario.perfil)) throw new ErroApi('SEM_PERMISSAO', 'Seu perfil não tem acesso a isto.')
  return usuario
}
