// PATCH /api/loja/reservas/{id} (LOJISTA): a resposta da loja à reserva (RF20), seguindo o diagrama
// de estados (409 TRANSICAO_INVALIDA). Reserva de outra loja: 403.
//   { status: 'CONFIRMADA', prontaAs?: 'HH:MM' }  aceita e diz a partir de que horas fica pronta
//                                                 (o prazo para retirar conta daí; sem hora, agora)
//   { status: 'SEPARADA' }                        o produto está no balcão
//   { status: 'RECUSADA', motivo }                recusa: o estoque volta, o cupom fica livre e,
//                                                 se paga por Pix, o estorno é pedido
// A retirada é a compra registrada no balcão (POST /api/loja/compras, com a reserva num item), e
// cancelar é do cliente (PATCH /api/reservas/{id}/cancelar).
import { lojaDoLojista, type Rota } from '../../../_lib/contexto'
import { ErroApi } from '../../../_lib/erros'
import { json, lerCorpo } from '../../../_lib/http'
import { buscarReserva, expirarVencidas, mudarStatusDaReserva, reservaParaLoja } from '../../../_lib/repo/reservas'
import { prontaAPartirDe, type StatusReserva } from '../../../_lib/regras/reserva'

const PEDIDOS_DA_LOJA: StatusReserva[] = ['CONFIRMADA', 'SEPARADA', 'RECUSADA']

const OUTRO_CAMINHO: Partial<Record<string, string>> = {
  RETIRADA: 'A retirada é registrada no Atendimento: leia o QR do cliente e registre a compra com a reserva.',
  CANCELADA: 'Quem cancela é o cliente. Para a loja desistir, recuse a reserva dizendo o motivo.',
}

export const onRequestPatch: Rota<'id'> = async ({ request, params, env, data }) => {
  const lojaId = lojaDoLojista(data)
  const id = String(params.id)
  const corpo = await lerCorpo(request)
  const novo = corpo.status
  if (typeof novo === 'string' && OUTRO_CAMINHO[novo]) throw new ErroApi('DADOS_INVALIDOS', OUTRO_CAMINHO[novo]!)
  if (typeof novo !== 'string' || !PEDIDOS_DA_LOJA.includes(novo as StatusReserva)) {
    throw new ErroApi('DADOS_INVALIDOS', `Informe o novo status: ${PEDIDOS_DA_LOJA.join(', ')}.`)
  }
  if (corpo.prontaAs !== undefined && typeof corpo.prontaAs !== 'string') {
    throw new ErroApi('DADOS_INVALIDOS', 'Informe a hora em que fica pronta no formato HH:MM, como 15:30.')
  }
  const agora = new Date()
  await expirarVencidas(env.DB, { reservaId: id }, agora)
  const reserva = await buscarReserva(env.DB, id)
  if (!reserva) throw new ErroApi('NAO_ENCONTRADO', 'Essa reserva não existe.')
  if (reserva.loja_id !== lojaId) throw new ErroApi('SEM_PERMISSAO', 'Essa reserva é de outra loja.')
  const prontaEm = novo === 'CONFIRMADA' ? prontaAPartirDe(corpo.prontaAs as string | undefined, agora) : undefined
  const motivo = typeof corpo.motivo === 'string' ? corpo.motivo : undefined
  return json(reservaParaLoja(await mudarStatusDaReserva(env.DB, reserva, novo as StatusReserva, { agora, prontaEm, motivo })))
}
