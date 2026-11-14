import type { StatusReserva } from '../../tipos/loja'

/** O que a loja pode fazer com uma reserva: as três respostas do PATCH e a retirada no balcão. */
export type DestinoDaLoja = 'CONFIRMADA' | 'SEPARADA' | 'RECUSADA' | 'RETIRADA'

/**
 * Para onde a loja pode levar uma reserva, segundo o diagrama de estados (docs/uml.md). A loja
 * confirma antes de separar; cancelar é do cliente; EXPIRADA é automática (RN01, RN02). A API
 * confere de novo e devolve 409 TRANSICAO_INVALIDA; esta tabela serve para a tela só mostrar os
 * botões que valem. RETIRADA é a compra registrada no Atendimento.
 */
export const TRANSICOES_DA_LOJA: Record<StatusReserva, readonly DestinoDaLoja[]> = {
  PENDENTE: ['CONFIRMADA', 'RECUSADA'],
  CONFIRMADA: ['SEPARADA', 'RETIRADA', 'RECUSADA'],
  SEPARADA: ['RETIRADA', 'RECUSADA'],
  RETIRADA: [],
  CANCELADA: [],
  RECUSADA: [],
  EXPIRADA: [],
}

export function podeMudar(de: StatusReserva, para: StatusReserva) {
  return (TRANSICOES_DA_LOJA[de] as readonly StatusReserva[]).includes(para)
}

/** Reservas que ainda seguram estoque e aparecem para a loja. */
export const STATUS_ATIVOS: readonly StatusReserva[] = ['PENDENTE', 'CONFIRMADA', 'SEPARADA']

/** Reservas que terminaram: retiradas, canceladas pelo cliente, recusadas pela loja ou expiradas. */
export const STATUS_ENCERRADOS: readonly StatusReserva[] = ['RETIRADA', 'CANCELADA', 'RECUSADA', 'EXPIRADA']

/** Reservas que o cliente já pode levar no balcão (a loja já confirmou). */
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
  RECUSADA: 'Recusada',
  EXPIRADA: 'Expirada',
}

/** "tamanho 42 · preto · 2 unidades": o que identifica a reserva no balcão, sem o que falta. */
export function detalheDaReserva({ tamanho, cor, quantidade }: { tamanho: string | null; cor: string | null; quantidade: number }) {
  return [tamanho && `tamanho ${tamanho}`, cor, quantidade > 1 && `${quantidade} unidades`].filter(Boolean).join(' · ')
}
