// POST /api/auth/login (público): { email, senha } → { token, usuario }
import { abrirSessao } from '../../_lib/auth/sessao'
import { gerarHashSenha, hashParaComparar, precisaAtualizar, verificarSenha } from '../../_lib/auth/senha'
import type { Rota } from '../../_lib/contexto'
import { ErroApi } from '../../_lib/erros'
import { json, lerCorpo, texto } from '../../_lib/http'
import { atualizarSenhaHash, buscarUsuarioPorEmail } from '../../_lib/repo/usuarios'

export const onRequestPost: Rota = async ({ request, env, waitUntil }) => {
  const corpo = await lerCorpo(request)
  const email = texto(corpo, 'email', { max: 200 }).toLowerCase()
  const senha = texto(corpo, 'senha', { max: 200, aparar: false })

  const usuario = await buscarUsuarioPorEmail(env.DB, email)
  // Mesma resposta (e o mesmo tempo) para e-mail inexistente e senha errada.
  const confere = await verificarSenha(senha, usuario?.senha_hash ?? (await hashParaComparar()))
  if (!usuario || !confere) throw new ErroApi('NAO_AUTENTICADO', 'E-mail ou senha incorretos.')

  // Hash com iterações antigas: regrava com as atuais, sem atrasar a resposta.
  if (precisaAtualizar(usuario.senha_hash)) {
    waitUntil(
      gerarHashSenha(senha)
        .then((hash) => atualizarSenhaHash(env.DB, usuario.id, hash))
        .catch((erro) => console.error('Não deu para atualizar o hash da senha:', erro)),
    )
  }

  return json(await abrirSessao(usuario, env))
}
