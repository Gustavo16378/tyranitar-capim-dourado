// POST /api/reservas/{id}/pagamento (CLIENTE): confirma o Pix simulado. A reserva fica paga e passa
// a valer 48 h (RN02); o status não muda, porque quem separa é a loja. 409 se ela não estiver
// esperando pagamento (já paga, pagar na loja, retirada, cancelada ou expirada).
import { exigirPerfil, type Rota } from '../../../_lib/contexto'
import { ErroApi } from '../../../_lib/erros'
import { json } from '../../../_lib/http'
import { pagarReserva, reservaDoCliente, reservaParaCliente } from '../../../_lib/repo/reservas'

export const onRequestPost: Rota<'id'> = async ({ params, env, data }) => {
  const cliente = exigirPerfil(data, 'CLIENTE')
  const reserva = await reservaDoCliente(env.DB, String(params.id), cliente.id)
  if (!reserva) throw new ErroApi('NAO_ENCONTRADO', 'Não achamos essa reserva.')
  return json(reservaParaCliente(await pagarReserva(env.DB, reserva)))
}
