// POST /api/reservas, GET /api/reservas/{id}, POST /api/reservas/{id}/pagamento e
// PATCH /api/reservas/{id}/cancelar (docs/api.md › Reservas).
import type { ProdutoResumo } from './produto'

export type StatusReserva = 'PENDENTE' | 'CONFIRMADA' | 'SEPARADA' | 'RETIRADA' | 'CANCELADA' | 'EXPIRADA'

export type FormaPagamento = 'PIX' | 'NA_LOJA'

export interface NovaReserva {
  produtoId: string
  quantidade: number
  formaPagamento: FormaPagamento
}

/** Resposta de POST /api/reservas, do pagamento e do cancelamento. */
export interface Reserva {
  id: string
  /** Pagar o Pix não muda o status: a reserva segue PENDENTE, agora paga. Quem separa é a loja. */
  status: StatusReserva
  formaPagamento: FormaPagamento
  pago: boolean
  /** Cancelada depois de paga por Pix: o estorno (simulado, como o Pix) foi pedido. */
  estornoSolicitado: boolean
  precoCentavos: number
  /** ISO 8601 (UTC). Pagar na loja: 4 h (RN01). Paga por Pix: 48 h (RN02). */
  expiraEm: string
  /** Só quando a forma é PIX. */
  pix?: { copiaECola: string; simulado: boolean }
}

/** GET /api/reservas/{id}: a reserva com o produto no formato da busca (null se ele saiu do banco). */
export interface ReservaDetalhe extends Reserva {
  produto: ProdutoResumo | null
}
