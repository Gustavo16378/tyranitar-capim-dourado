// GET /api/me/favoritos (CLIENTE): os produtos que o cliente salvou, do mais recente para o mais
// antigo, no formato da busca e com paginação. O Início mostra em "Você salvou".
import { exigirPerfil, type Rota } from '../../../_lib/contexto'
import { json, paginacao } from '../../../_lib/http'
import { listarFavoritos } from '../../../_lib/repo/produtos'

export const onRequestGet: Rota = async ({ request, env, data }) => {
  const { id } = exigirPerfil(data, 'CLIENTE')
  return json(await listarFavoritos(env.DB, id, paginacao(new URL(request.url))))
}
