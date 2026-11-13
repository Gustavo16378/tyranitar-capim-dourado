// PATCH /api/loja/reservas/{id} (LOJISTA): { status } para confirmar, separar, marcar retirada ou
// cancelar (RF20). Segue o diagrama de estados (409 TRANSICAO_INVALIDA). Reserva de outra loja: 403.
// Para somar os pontos da retirada, registre a compra em POST /api/loja/compras com reservaId.
import { lojaDoLojista, type Rota } from '../../../_lib/contexto'
import { ErroApi } from '../../../_lib/erros'
import { json, lerCorpo } from '../../../_lib/http'
import { buscarReserva, expirarVencidas, mudarStatusDaReserva, reservaParaLoja } from '../../../_lib/repo/reservas'
import type { StatusReserva } from '../../../_lib/regras/reserva'

/** O que a loja pode pedir. EXPIRADA é automática e PENDENTE é só a criação. */
const PEDIDOS_DA_LOJA: StatusReserva[] = ['CONFIRMADA', 'SEPARADA', 'RETIRADA', 'CANCELADA']

export const onRequestPatch: Rota<'id'> = async ({ request, params, env, data }) => {
  const lojaId = lojaDoLojista(data)
  const id = String(params.id)
  const novo = (await lerCorpo(request)).status
  if (typeof novo !== 'string' || !PEDIDOS_DA_LOJA.includes(novo as StatusReserva)) {
    throw new ErroApi('DADOS_INVALIDOS', `Informe o novo status: ${PEDIDOS_DA_LOJA.join(', ')}.`)
  }
  await expirarVencidas(env.DB, { reservaId: id })
  const reserva = await buscarReserva(env.DB, id)
  if (!reserva) throw new ErroApi('NAO_ENCONTRADO', 'Essa reserva não existe.')
  if (reserva.loja_id !== lojaId) throw new ErroApi('SEM_PERMISSAO', 'Essa reserva é de outra loja.')
  return json(reservaParaLoja(await mudarStatusDaReserva(env.DB, reserva, novo as StatusReserva)))
}
