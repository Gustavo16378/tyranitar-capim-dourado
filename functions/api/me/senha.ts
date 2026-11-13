// PUT /api/me/senha (CLIENTE): { senhaAtual, novaSenha } troca a senha. Pede a atual, para quem
// pega o celular desbloqueado não trocar a senha de outra pessoa. Responde 204.
// Senha atual errada: 400 (e não 401, que encerraria a sessão no app). Com a demo ligada, a conta
// de demonstração não troca de senha: ela é de todo mundo que testa.
import { gerarHashSenha, verificarSenha } from '../../_lib/auth/senha'
import { exigirPerfil, type Rota } from '../../_lib/contexto'
import { ErroApi } from '../../_lib/erros'
import { lerCorpo, texto } from '../../_lib/http'
import { contaLogada, ehContaDaDemonstracao } from '../../_lib/repo/conta'
import { atualizarSenhaHash, buscarUsuarioPorId } from '../../_lib/repo/usuarios'

export const onRequestPut: Rota = async ({ request, env, data }) => {
  const { id } = exigirPerfil(data, 'CLIENTE')
  const corpo = await lerCorpo(request)
  const senhaAtual = texto(corpo, 'senhaAtual', { max: 200, aparar: false })
  // Os mesmos limites do cadastro.
  const novaSenha = texto(corpo, 'novaSenha', { min: 8, max: 200, aparar: false })

  const conta = await contaLogada(env.DB, id)
  if (ehContaDaDemonstracao(conta, env)) {
    throw new ErroApi('SEM_PERMISSAO', 'A conta de demonstração não troca de senha. Crie uma conta para testar.')
  }
  const usuario = await buscarUsuarioPorId(env.DB, id)
  if (!usuario || !(await verificarSenha(senhaAtual, usuario.senha_hash))) {
    throw new ErroApi('DADOS_INVALIDOS', 'A senha atual não confere. Confira e tente de novo.')
  }
  if (senhaAtual === novaSenha) {
    throw new ErroApi('DADOS_INVALIDOS', 'A senha nova precisa ser diferente da atual.')
  }
  await atualizarSenhaHash(env.DB, id, await gerarHashSenha(novaSenha))
  return new Response(null, { status: 204 })
}
