// GET /api/me/notificacoes (CLIENTE): os avisos do cliente, os mais novos primeiro (?tamanho=, até
// 50), e quantos estão sem ler: no total (o selo do Início) e das reservas (o selo da Carteira).
// Cada mudança da reserva, os pontos de uma compra e o que mais o app avisar entram aqui.
import { exigirPerfil, type Rota } from '../../../_lib/contexto'
import { json } from '../../../_lib/http'
import { listarNotificacoes } from '../../../_lib/repo/notificacoes'

export const onRequestGet: Rota = async ({ request, env, data }) => {
  const { id } = exigirPerfil(data, 'CLIENTE')
  const tamanho = Math.min(50, Math.max(1, Number(new URL(request.url).searchParams.get('tamanho') ?? 20) || 20))
  return json(await listarNotificacoes(env.DB, id, tamanho))
}
