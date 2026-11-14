// POST /api/reservas, GET /api/reservas/{id}, POST /api/reservas/{id}/pagamento e
// PATCH /api/reservas/{id}/cancelar (docs/api.md › Reservas).
import type { ProdutoResumo } from './produto'

/**
 * PENDENTE (a loja ainda vai confirmar) → CONFIRMADA (pronta a partir de prontaEm) → SEPARADA →
 * RETIRADA (a compra no balcão). Sai antes como CANCELADA (o cliente), RECUSADA (a loja, com
 * motivo) ou EXPIRADA (o prazo).
 */
export type StatusReserva = 'PENDENTE' | 'CONFIRMADA' | 'SEPARADA' | 'RETIRADA' | 'CANCELADA' | 'RECUSADA' | 'EXPIRADA'

export type FormaPagamento = 'PIX' | 'NA_LOJA'

export interface NovaReserva {
  produtoId: string
  quantidade: number
  formaPagamento: FormaPagamento
  /** Das opções do produto (GET /api/produtos/{id}/cupons); sem ele, a loja combina no balcão. */
  tamanho?: string
  cor?: string
  /** Um dos cupons que valem para o produto: o preço e o Pix já saem com o desconto. */
  cupomId?: string
}

/** Um cupom do cliente que vale para o produto, com o desconto que daria na reserva. */
export interface CupomParaOProduto {
  id: string
  titulo: string
  origem: 'LOJA' | 'SHOPPING'
  /** A loja do cupom; null no voucher do shopping. */
  loja: string | null
  /** A categoria em que ele desconta ("Calçados"); null: a loja toda, ou qualquer loja. */
  categoria: string | null
  descontoCentavos: number
}

/** GET /api/produtos/{id}/cupons: as opções de tamanho e cor do produto e os cupons que valem para ele. */
export interface OpcoesDaReserva {
  tamanhos: string[]
  cores: string[]
  itens: CupomParaOProduto[]
}

/** Resposta de POST /api/reservas, do pagamento e do cancelamento. */
export interface Reserva {
  id: string
  /** Pagar o Pix não muda o status: quem confirma e separa é a loja. */
  status: StatusReserva
  formaPagamento: FormaPagamento
  pago: boolean
  /** Saiu depois de paga por Pix (cancelada, recusada ou expirada): o estorno (simulado, como o Pix) foi pedido. */
  estornoSolicitado: boolean
  /** Preço × quantidade, sem desconto. */
  brutoCentavos: number
  descontoCentavos: number
  /** O total, já com o desconto do cupom: o valor do Pix. */
  precoCentavos: number
  tamanho: string | null
  cor: string | null
  cupom: { id: string; titulo: string; origem: 'LOJA' | 'SHOPPING' } | null
  /** ISO 8601. A hora que a loja informou ao confirmar: pronta para retirar a partir dela. */
  prontaEm: string | null
  /** Recusada: o motivo que a loja deu. */
  motivoRecusa: string | null
  /** ISO 8601 (UTC). Pendente: o prazo da loja confirmar. Confirmada: 4 h desde prontaEm (RN01), 48 h se paga por Pix (RN02). */
  expiraEm: string
  /** Só quando a forma é PIX. */
  pix?: { copiaECola: string; simulado: boolean }
}

/** GET /api/reservas/{id}: a reserva com o produto no formato da busca (null se ele saiu do banco). */
export interface ReservaDetalhe extends Reserva {
  produto: ProdutoResumo | null
}
