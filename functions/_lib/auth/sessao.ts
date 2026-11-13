import type { UsuarioLinha } from '../repo/usuarios'
import { emitirToken, type UsuarioSessao } from './jwt'

/** Resposta de login e cadastro: { token, usuario }. */
export async function abrirSessao(linha: Pick<UsuarioLinha, 'id' | 'nome' | 'perfil' | 'loja_id'>, env: Env) {
  const usuario: UsuarioSessao = { id: linha.id, nome: linha.nome, perfil: linha.perfil, lojaId: linha.loja_id }
  return { token: await emitirToken(usuario, env.JWT_SECRET), usuario }
}
