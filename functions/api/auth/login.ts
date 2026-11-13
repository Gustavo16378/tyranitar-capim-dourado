// POST /api/auth/login (público): { email, senha } → { token, usuario }
import { abrirSessao } from '../../_lib/auth/sessao'
import { hashParaComparar, verificarSenha } from '../../_lib/auth/senha'
import type { Rota } from '../../_lib/contexto'
import { ErroApi } from '../../_lib/erros'
import { json, lerCorpo, texto } from '../../_lib/http'
import { buscarUsuarioPorEmail } from '../../_lib/repo/usuarios'

export const onRequestPost: Rota = async ({ request, env }) => {
  const corpo = await lerCorpo(request)
  const email = texto(corpo, 'email', { max: 200 }).toLowerCase()
  const senha = texto(corpo, 'senha', { max: 200, aparar: false })

  const usuario = await buscarUsuarioPorEmail(env.DB, email)
  // Mesma resposta (e o mesmo tempo) para e-mail inexistente e senha errada.
  const confere = await verificarSenha(senha, usuario?.senha_hash ?? (await hashParaComparar()))
  if (!usuario || !confere) throw new ErroApi('NAO_AUTENTICADO', 'E-mail ou senha incorretos.')

  return json(await abrirSessao(usuario, env))
}
