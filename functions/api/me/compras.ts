// GET /api/me/compras (CLIENTE): o histórico de compras do cliente (RF16), da mais nova para a
// mais antiga, com paginação: a loja, a data, o valor pago, os cupons usados e os pontos ganhos.
// A Carteira mostra as últimas em "Minhas compras"; "Ver tudo" abre a lista inteira.
import { exigirPerfil, type Rota } from '../../_lib/contexto'
import { json, paginacao } from '../../_lib/http'
import { listarComprasDoCliente } from '../../_lib/repo/compras'

export const onRequestGet: Rota = async ({ request, env, data }) => {
  const { id } = exigirPerfil(data, 'CLIENTE')
  return json(await listarComprasDoCliente(env.DB, id, paginacao(new URL(request.url))))
}
