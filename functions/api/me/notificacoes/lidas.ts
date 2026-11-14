// POST /api/me/notificacoes/lidas (CLIENTE): { tipo? } marca os avisos como lidos: todos (o Início
// abriu a lista) ou só os de um tipo ("RESERVA": a Carteira abriu). → { lidas: N }.
import { exigirPerfil, type Rota } from '../../../_lib/contexto'
import { ErroApi } from '../../../_lib/erros'
import { json, lerCorpo } from '../../../_lib/http'
import { marcarComoLidas, TIPOS_DE_NOTIFICACAO } from '../../../_lib/repo/notificacoes'

export const onRequestPost: Rota = async ({ request, env, data }) => {
  const { id } = exigirPerfil(data, 'CLIENTE')
  const { tipo } = await lerCorpo(request)
  if (tipo !== undefined && !TIPOS_DE_NOTIFICACAO.includes(tipo as never)) {
    throw new ErroApi('DADOS_INVALIDOS', `Tipo desconhecido. Use: ${TIPOS_DE_NOTIFICACAO.join(', ')}.`)
  }
  return json({ lidas: await marcarComoLidas(env.DB, id, tipo as (typeof TIPOS_DE_NOTIFICACAO)[number] | undefined) })
}
