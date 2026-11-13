// GET /api/me (CLIENTE): a conta do cliente para a tela Minha conta: nome, e-mail, nível,
// pontos e se a ficha é compartilhada com as lojas.
// DELETE /api/me (CLIENTE): exclui a conta (LGPD): apaga os dados pessoais e cancela as reservas
// em aberto; as compras ficam, sem dados pessoais, como registro das lojas. Responde 204.
// Esta rota fica fora da área /api/me/ do _middleware: confere sozinha o perfil CLIENTE.
import { exigirPerfil, type Rota } from '../../_lib/contexto'
import { ErroApi } from '../../_lib/erros'
import { json } from '../../_lib/http'
import { buscarConta, excluirConta } from '../../_lib/repo/conta'

/** A conta de demonstração (POST /api/auth/demo) não pode sumir enquanto a demo estiver ligada. */
const EMAIL_DA_DEMONSTRACAO = 'ana.souza@demo.test'

/** A conta logada; se ela foi excluída, o token não vale mais (401: o app volta para o login). */
async function contaLogada(db: D1Database, clienteId: string) {
  const conta = await buscarConta(db, clienteId)
  if (!conta) throw new ErroApi('NAO_AUTENTICADO', 'Essa conta não existe mais. Entre com outra conta.')
  return conta
}

export const onRequestGet: Rota = async ({ env, data }) => {
  const { id } = exigirPerfil(data, 'CLIENTE')
  return json(await contaLogada(env.DB, id))
}

export const onRequestDelete: Rota = async ({ env, data }) => {
  const { id } = exigirPerfil(data, 'CLIENTE')
  const conta = await contaLogada(env.DB, id)
  if (env.DEMO === '1' && conta.email.toLowerCase() === EMAIL_DA_DEMONSTRACAO) {
    throw new ErroApi('SEM_PERMISSAO', 'A conta de demonstração não pode ser excluída. Para sair dela, use Sair.')
  }
  await excluirConta(env.DB, id)
  return new Response(null, { status: 204 })
}
