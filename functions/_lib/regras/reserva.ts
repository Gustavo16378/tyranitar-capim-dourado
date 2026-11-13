// RN01, RN02 e RF20: prazos da reserva e as transições de status (docs/uml.md).
// Pages Functions não roda tarefa agendada: a expiração é conferida sempre que a reserva é lida.
import { ErroApi } from '../erros'
import { somarHoras } from './datas'

export type StatusReserva = 'PENDENTE' | 'CONFIRMADA' | 'SEPARADA' | 'RETIRADA' | 'CANCELADA' | 'EXPIRADA'
export type FormaPagamento = 'NA_LOJA' | 'PIX'
/** Horas de prazo por forma de pagamento (configuração "prazo_reserva_horas"). */
export type PrazosReserva = Record<FormaPagamento, number>

export const PRAZOS_PADRAO: PrazosReserva = { NA_LOJA: 4, PIX: 48 }

/**
 * Quando a reserva expira. Pagar na loja: criação + 4 h (RN01). Pix pago: pagamento + 48 h
 * (RN02). Pix ainda não pago tem o mesmo prazo de pagar na loja para ser pago.
 */
export function calcularExpiracao(
  reserva: { forma: FormaPagamento; criadaEm: Date; pagaEm?: Date | null },
  prazos: PrazosReserva = PRAZOS_PADRAO,
): Date {
  if (reserva.forma === 'PIX' && reserva.pagaEm) return somarHoras(reserva.pagaEm, prazos.PIX)
  return somarHoras(reserva.criadaEm, prazos.NA_LOJA)
}

export const TRANSICOES: Record<StatusReserva, readonly StatusReserva[]> = {
  PENDENTE: ['CONFIRMADA', 'SEPARADA', 'CANCELADA', 'EXPIRADA'],
  CONFIRMADA: ['SEPARADA', 'RETIRADA', 'CANCELADA', 'EXPIRADA'],
  SEPARADA: ['RETIRADA', 'CANCELADA', 'EXPIRADA'],
  RETIRADA: [],
  CANCELADA: [],
  EXPIRADA: [],
}

/** Status em que a reserva ainda segura o estoque. */
export const STATUS_ATIVOS: readonly StatusReserva[] = ['PENDENTE', 'CONFIRMADA', 'SEPARADA']

export function podeMudar(de: StatusReserva, para: StatusReserva) {
  return TRANSICOES[de].includes(para)
}

/** O novo status, ou 409 TRANSICAO_INVALIDA se o diagrama de estados não permite. */
export function mudarStatus(de: StatusReserva, para: StatusReserva): StatusReserva {
  if (!podeMudar(de, para)) {
    throw new ErroApi('TRANSICAO_INVALIDA', `Uma reserva ${de.toLowerCase()} não pode passar para ${para.toLowerCase()}.`)
  }
  return para
}

/** O status valendo agora: uma reserva ativa depois do prazo é EXPIRADA. */
export function statusEfetivo(reserva: { status: StatusReserva; expiraEm: string | Date }, agora: Date): StatusReserva {
  const expira = reserva.expiraEm instanceof Date ? reserva.expiraEm : new Date(reserva.expiraEm)
  return STATUS_ATIVOS.includes(reserva.status) && agora.getTime() > expira.getTime() ? 'EXPIRADA' : reserva.status
}
