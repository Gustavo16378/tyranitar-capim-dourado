// POST /api/loja/compras/previa (LOJISTA): o mesmo corpo de POST /api/loja/compras, mas não grava
// nada. Devolve descontos, valor pago, pontos e reembolso para o caixa mostrar "Cliente paga"
// antes de registrar, com os mesmos erros (cupom inválido, cupons incompatíveis, reserva).
import { lojaDoLojista, type Rota } from '../../../_lib/contexto'
import { json, lerCorpo } from '../../../_lib/http'
import { calcularCompra, compraParaApi, lerPedidoDeCompra } from '../../../_lib/loja/caixa'

export const onRequestPost: Rota = async ({ request, env, data }) => {
  const compra = await calcularCompra(env.DB, lojaDoLojista(data), lerPedidoDeCompra(await lerCorpo(request)))
  return json(compraParaApi(compra))
}
