// Tipos das rotas e a checagem de perfil.
import type { Perfil, UsuarioSessao } from './auth/jwt'
import { ErroApi } from './erros'

/** O que o _middleware deixa em context.data. */
export interface Dados extends Record<string, unknown> {
  usuario?: UsuarioSessao
}

/** Tipo de toda rota: export const onRequestGet: Rota = async ({ request, env, data }) => ... */
export type Rota<Params extends string = string> = PagesFunction<Env, Params, Dados>

/** A loja do lojista logado. Toda consulta do painel filtra por ela, nunca por um id do pedido. */
export function lojaDoLojista(dados: Dados): string {
  const usuario = exigirPerfil(dados, 'LOJISTA')
  if (!usuario.lojaId) throw new ErroApi('SEM_PERMISSAO', 'Sua conta não está ligada a uma loja.')
  return usuario.lojaId
}

/** O usuário logado, se o perfil dele for um dos pedidos. Sem login: 401; outro perfil: 403. */
export function exigirPerfil(dados: Dados, ...perfis: Perfil[]): UsuarioSessao {
  const usuario = dados.usuario
  if (!usuario) throw new ErroApi('NAO_AUTENTICADO', 'Entre na sua conta para continuar.')
  if (!perfis.includes(usuario.perfil)) throw new ErroApi('SEM_PERMISSAO', 'Seu perfil não tem acesso a isto.')
  return usuario
}
