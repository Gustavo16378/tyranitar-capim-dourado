import type { StatusPedidoPelaLoja, StatusReserva } from '../../tipos/loja'

/**
 * Para onde a loja pode levar uma reserva, segundo o diagrama de estados (docs/uml.md).
 * EXPIRADA é automática (RN01, RN02) e não aparece aqui. A API confere de novo e devolve
 * 409 TRANSICAO_INVALIDA; esta tabela serve para a tela só mostrar os botões que valem.
 */
export const TRANSICOES_DA_LOJA: Record<StatusReserva, readonly StatusPedidoPelaLoja[]> = {
  PENDENTE: ['CONFIRMADA', 'SEPARADA', 'CANCELADA'],
  CONFIRMADA: ['SEPARADA', 'RETIRADA', 'CANCELADA'],
  SEPARADA: ['RETIRADA', 'CANCELADA'],
  RETIRADA: [],
  CANCELADA: [],
  EXPIRADA: [],
}

export function podeMudar(de: StatusReserva, para: StatusReserva) {
  return (TRANSICOES_DA_LOJA[de] as readonly StatusReserva[]).includes(para)
}

/** Reservas que ainda seguram estoque e aparecem para a loja. */
export const STATUS_ATIVOS: readonly StatusReserva[] = ['PENDENTE', 'CONFIRMADA', 'SEPARADA']

/** Reservas que o cliente já pode levar no balcão. */
export function podeRetirar(status: StatusReserva) {
  return podeMudar(status, 'RETIRADA')
}

/** Como cada status aparece escrito (estado sempre com palavra, nunca só cor). */
export const ROTULO_DO_STATUS: Record<StatusReserva, string> = {
  PENDENTE: 'Nova',
  CONFIRMADA: 'Confirmada',
  SEPARADA: 'Separada',
  RETIRADA: 'Retirada',
  CANCELADA: 'Cancelada',
  EXPIRADA: 'Expirada',
}
