// POST /api/auth/demo (público, sem corpo): entra com a conta de demonstração, a cliente Ana do
// seed, sem senha. É o botão "Entrar com a conta de demonstração" do app, para a banca testar
// sem cadastro. Só funciona com DEMO=1 (wrangler.toml); desligada, responde 404.
// Sempre devolve token de CLIENTE: nunca abre o painel da loja nem o do shopping.
import { abrirSessao } from '../../_lib/auth/sessao'
import type { Rota } from '../../_lib/contexto'
import { ErroApi } from '../../_lib/erros'
import { json } from '../../_lib/http'
import { buscarUsuarioPorEmail } from '../../_lib/repo/usuarios'

const EMAIL_DA_DEMONSTRACAO = 'ana.souza@demo.test'

export const onRequestPost: Rota = async ({ env }) => {
  if (env.DEMO !== '1') throw new ErroApi('NAO_ENCONTRADO', 'A conta de demonstração está desligada.')
  const ana = await buscarUsuarioPorEmail(env.DB, EMAIL_DA_DEMONSTRACAO)
  if (!ana || ana.perfil !== 'CLIENTE') throw new ErroApi('NAO_ENCONTRADO', 'A conta de demonstração não está no banco.')
  return json(await abrirSessao(ana, env))
}
