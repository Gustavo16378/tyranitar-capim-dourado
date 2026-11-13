// POST /api/reservas e POST /api/reservas/{id}/pagamento (docs/api.md › Reservas).

export type StatusReserva = 'PENDENTE' | 'CONFIRMADA' | 'SEPARADA' | 'RETIRADA' | 'CANCELADA' | 'EXPIRADA'

export type FormaPagamento = 'PIX' | 'NA_LOJA'

export interface NovaReserva {
  produtoId: string
  quantidade: number
  formaPagamento: FormaPagamento
}

export interface Reserva {
  id: string
  status: StatusReserva
  formaPagamento: FormaPagamento
  pago: boolean
  precoCentavos: number
  /** ISO 8601 (UTC). Pagar na loja: 4 h (RN01). Paga por Pix: 48 h (RN02). */
  expiraEm: string
  /** Só quando a forma é PIX. */
  pix?: { copiaECola: string; simulado: boolean }
}
