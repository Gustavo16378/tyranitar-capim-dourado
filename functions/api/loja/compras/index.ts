// POST /api/loja/compras (LOJISTA): registra a compra no caixa, com cupons, e soma os pontos (RF19).
// { qrToken, valorCentavos, cupons, reservaId? } → 201 com descontos, valor pago, pontos e reembolso.
import { lojaDoLojista, type Rota } from '../../../_lib/contexto'
import { json, lerCorpo } from '../../../_lib/http'
import { calcularCompra, compraParaApi, lerPedidoDeCompra, registrarCompra } from '../../../_lib/loja/caixa'

export const onRequestPost: Rota = async ({ request, env, data }) => {
  const lojaId = lojaDoLojista(data)
  const agora = new Date()
  const compra = await calcularCompra(env.DB, lojaId, lerPedidoDeCompra(await lerCorpo(request)), agora)
  const id = await registrarCompra(env.DB, compra, agora)
  return json(compraParaApi(compra, id), 201)
}
