// PUT /api/me/consentimento (CLIENTE): { compartilharFicha } liga ou desliga o compartilhamento
// da ficha de interesses com as lojas (RF13). Com false, a ficha é apagada na hora (RNF06).
// Responde a conta atualizada, como GET /api/me.
import { exigirPerfil, type Rota } from '../../_lib/contexto'
import { ErroApi } from '../../_lib/erros'
import { json, lerCorpo } from '../../_lib/http'
import { buscarConta, mudarConsentimento } from '../../_lib/repo/conta'

export const onRequestPut: Rota = async ({ request, env, data }) => {
  const { id } = exigirPerfil(data, 'CLIENTE')
  const { compartilharFicha } = await lerCorpo(request)
  if (typeof compartilharFicha !== 'boolean') {
    throw new ErroApi('DADOS_INVALIDOS', 'Informe compartilharFicha: true ou false.')
  }
  await mudarConsentimento(env.DB, id, compartilharFicha)
  const conta = await buscarConta(env.DB, id)
  if (!conta) throw new ErroApi('NAO_AUTENTICADO', 'Essa conta não existe mais. Entre com outra conta.')
  return json(conta)
}
