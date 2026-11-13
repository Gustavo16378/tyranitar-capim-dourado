// GET /api/me (CLIENTE): a conta do cliente para a tela Minha conta: nome, e-mail, nível,
// pontos e se a ficha é compartilhada com as lojas.
// PATCH /api/me (CLIENTE): { nome } troca o nome; responde a conta atualizada, como o GET.
// DELETE /api/me (CLIENTE): exclui a conta (LGPD): apaga os dados pessoais e cancela as reservas
// em aberto; as compras ficam, sem dados pessoais, como registro das lojas. Responde 204.
// Esta rota fica fora da área /api/me/ do _middleware: confere sozinha o perfil CLIENTE.
import { exigirPerfil, type Rota } from '../../_lib/contexto'
import { ErroApi } from '../../_lib/erros'
import { json, lerCorpo, texto } from '../../_lib/http'
import { contaLogada, ehContaDaDemonstracao, excluirConta, mudarNome } from '../../_lib/repo/conta'

export const onRequestGet: Rota = async ({ env, data }) => {
  const { id } = exigirPerfil(data, 'CLIENTE')
  return json(await contaLogada(env.DB, id))
}

export const onRequestPatch: Rota = async ({ request, env, data }) => {
  const { id } = exigirPerfil(data, 'CLIENTE')
  // Os mesmos limites do cadastro.
  const nome = texto(await lerCorpo(request), 'nome', { min: 2, max: 100 }).replace(/\s+/g, ' ')
  await contaLogada(env.DB, id)
  await mudarNome(env.DB, id, nome)
  return json(await contaLogada(env.DB, id))
}

export const onRequestDelete: Rota = async ({ env, data }) => {
  const { id } = exigirPerfil(data, 'CLIENTE')
  const conta = await contaLogada(env.DB, id)
  if (ehContaDaDemonstracao(conta, env)) {
    throw new ErroApi('SEM_PERMISSAO', 'A conta de demonstração não pode ser excluída. Para sair dela, use Sair.')
  }
  await excluirConta(env.DB, id)
  return new Response(null, { status: 204 })
}
