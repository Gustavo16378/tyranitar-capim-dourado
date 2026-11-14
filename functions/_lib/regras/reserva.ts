// RN01, RN02 e RF20: prazos da reserva e as transições de status (docs/uml.md).
// Pages Functions não roda tarefa agendada: a expiração é conferida sempre que a reserva é lida.
//
//   PENDENTE ──loja confirma (pronta a partir de HH:MM)──▶ CONFIRMADA ──loja separa──▶ SEPARADA
//   CONFIRMADA ou SEPARADA ──compra registrada no balcão──▶ RETIRADA
//   em aberto ──cliente cancela──▶ CANCELADA · ──loja recusa, com motivo──▶ RECUSADA · ──prazo──▶ EXPIRADA
import { ErroApi } from '../erros'
import { somarHoras } from './datas'

export type StatusReserva = 'PENDENTE' | 'CONFIRMADA' | 'SEPARADA' | 'RETIRADA' | 'CANCELADA' | 'RECUSADA' | 'EXPIRADA'
export type FormaPagamento = 'NA_LOJA' | 'PIX'
/** Horas de prazo por forma de pagamento (configuração "prazo_reserva_horas"). */
export type PrazosReserva = Record<FormaPagamento, number>

export const PRAZOS_PADRAO: PrazosReserva = { NA_LOJA: 4, PIX: 48 }

/**
 * Quando a reserva expira.
 * - Pendente: a loja tem o prazo de pagar na loja (4 h) desde a criação para confirmar.
 * - Confirmada: o prazo para retirar conta da hora que a loja informou (prontaEm): 4 h para pagar
 *   na loja (RN01), 48 h se já foi paga por Pix (RN02). Pagar o Pix depois de confirmada estende.
 */
export function calcularExpiracao(
  reserva: { forma: FormaPagamento; criadaEm: Date; prontaEm?: Date | null; pago?: boolean },
  prazos: PrazosReserva = PRAZOS_PADRAO,
): Date {
  if (!reserva.prontaEm) return somarHoras(reserva.criadaEm, prazos.NA_LOJA)
  return somarHoras(reserva.prontaEm, reserva.forma === 'PIX' && reserva.pago ? prazos.PIX : prazos.NA_LOJA)
}

export const TRANSICOES: Record<StatusReserva, readonly StatusReserva[]> = {
  PENDENTE: ['CONFIRMADA', 'CANCELADA', 'RECUSADA', 'EXPIRADA'],
  CONFIRMADA: ['SEPARADA', 'RETIRADA', 'CANCELADA', 'RECUSADA', 'EXPIRADA'],
  SEPARADA: ['RETIRADA', 'CANCELADA', 'RECUSADA', 'EXPIRADA'],
  RETIRADA: [],
  CANCELADA: [],
  RECUSADA: [],
  EXPIRADA: [],
}

/** Status em que a reserva ainda segura o estoque (e o cupom). */
export const STATUS_ATIVOS: readonly StatusReserva[] = ['PENDENTE', 'CONFIRMADA', 'SEPARADA']

/** Status em que a reserva pode sair no balcão (a loja já confirmou). */
export const PRONTAS_PARA_RETIRAR: readonly StatusReserva[] = ['CONFIRMADA', 'SEPARADA']

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

/**
 * A hora em que a reserva fica pronta, a partir do "HH:MM" que a loja informou ao confirmar, no
 * horário de Palmas (UTC-3): hoje, ou amanhã se a hora já passou há mais de uma hora (a loja
 * confirmou de noite para a manhã). Sem hora, pronta agora. Hora inválida: 400.
 */
export function prontaAPartirDe(horaMinuto: string | null | undefined, agora: Date): Date {
  if (horaMinuto === null || horaMinuto === undefined || horaMinuto === '') return agora
  const partes = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(horaMinuto)
  if (!partes) throw new ErroApi('DADOS_INVALIDOS', 'Informe a hora em que fica pronta no formato HH:MM, como 15:30.')
  const PALMAS = -3 * 60 * 60 * 1000
  const local = new Date(agora.getTime() + PALMAS)
  const pronta = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), Number(partes[1]), Number(partes[2])) - PALMAS
  const UMA_HORA = 60 * 60 * 1000
  return new Date(pronta < agora.getTime() - UMA_HORA ? pronta + 24 * UMA_HORA : Math.max(pronta, agora.getTime()))
}
