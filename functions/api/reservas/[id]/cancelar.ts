// PATCH /api/reservas/{id}/cancelar (CLIENTE): o cliente desiste da própria reserva. Vale enquanto
// ela está em aberto (PENDENTE, CONFIRMADA ou SEPARADA): fica CANCELADA, o estoque volta na hora
// (RN03) e, se estava paga por Pix, o estorno fica pedido (simulado, como o Pix). Retirada,
// cancelada ou expirada: 409. Reserva de outro cliente: 404, igual a uma que não existe.
import { exigirPerfil, type Rota } from '../../../_lib/contexto'
import { ErroApi } from '../../../_lib/erros'
import { json } from '../../../_lib/http'
import { cancelarPeloCliente, reservaDoCliente, reservaParaCliente } from '../../../_lib/repo/reservas'

export const onRequestPatch: Rota<'id'> = async ({ params, env, data }) => {
  const cliente = exigirPerfil(data, 'CLIENTE')
  const reserva = await reservaDoCliente(env.DB, String(params.id), cliente.id)
  if (!reserva) throw new ErroApi('NAO_ENCONTRADO', 'Não achamos essa reserva.')
  return json(reservaParaCliente(await cancelarPeloCliente(env.DB, reserva)))
}
