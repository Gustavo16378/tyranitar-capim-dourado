// POST /api/reservas, GET /api/reservas/{id} e POST /api/reservas/{id}/pagamento (docs/api.md › Reservas).
import type { ProdutoResumo } from './produto'

export type StatusReserva = 'PENDENTE' | 'CONFIRMADA' | 'SEPARADA' | 'RETIRADA' | 'CANCELADA' | 'EXPIRADA'

export type FormaPagamento = 'PIX' | 'NA_LOJA'

export interface NovaReserva {
  produtoId: string
  quantidade: number
  formaPagamento: FormaPagamento
}

/** Resposta de POST /api/reservas e de POST /api/reservas/{id}/pagamento. */
export interface Reserva {
  id: string
  /** Pagar o Pix não muda o status: a reserva segue PENDENTE, agora paga. Quem separa é a loja. */
  status: StatusReserva
  formaPagamento: FormaPagamento
  pago: boolean
  precoCentavos: number
  /** ISO 8601 (UTC). Pagar na loja: 4 h (RN01). Paga por Pix: 48 h (RN02). */
  expiraEm: string
  /** Só quando a forma é PIX. */
  pix?: { copiaECola: string; simulado: boolean }
}

/** GET /api/reservas/{id}: a reserva com o produto no formato da busca. */
export interface ReservaDetalhe extends Reserva {
  produto: ProdutoResumo
}
