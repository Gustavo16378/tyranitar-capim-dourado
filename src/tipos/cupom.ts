// Cupons em GET /api/ofertas e em GET /api/me/carteira, e nos painéis: os da loja
// (/api/loja/cupons) e os vouchers do shopping (/api/shopping/cupons) (docs/api.md).
import type { NivelApi } from './comum'

export type TipoCupom = 'PERCENTUAL' | 'VALOR' | 'BRINDE'

/** Item de GET /api/ofertas, como a rota de functions/api/ofertas/index.ts devolve. */
export interface Oferta {
  id: string
  titulo: string
  tipo: TipoCupom
  /** PERCENTUAL: 1 a 100. VALOR: centavos. BRINDE: 0. */
  valor: number
  origem: 'LOJA' | 'SHOPPING'
  /** null quando é voucher do shopping. */
  loja: { id: string; nome: string; mapaId: string } | null
  categoriaAlvo: string | null
  nivelMinimo: NivelApi
  /** Data final de uso, "2026-12-31". */
  validade: string
  /** Cupom de uma categoria da ficha do cliente. */
  destaque: boolean
}

/**
 * Cupom da carteira: tipo e valor montam o canhoto ("10%", "R$ 20"); loja null é voucher do
 * shopping.
 */
export interface CupomCarteira {
  id: string
  titulo: string
  loja: string | null
  validade: string
  tipo: TipoCupom
  valor: number
  nivelMinimo: NivelApi
  /** Para que vale: a categoria em que desconta ("Calçados"); null na loja toda (ou em qualquer loja). */
  categoria: string | null
}

/** Cupom nos painéis, com o uso dele: o da loja e o voucher do shopping têm o mesmo formato. */
export interface CupomComUso {
  id: string
  titulo: string
  tipo: TipoCupom
  /** PERCENTUAL: 1 a 100. VALOR: centavos. BRINDE: 0. */
  valor: number
  /** Se preenchido, o cupom só aparece para quem tem interesse nessa categoria. */
  categoriaAlvo: string | null
  nivelMinimo: NivelApi
  limitePorCliente: number
  /** Último dia de uso, em Palmas: "2026-12-31". */
  validade: string
  ativo: boolean
  /** Quantas compras usaram o cupom. */
  usos: number
  /** Soma dos descontos dados com ele. */
  descontoCentavos: number
  /** Reservas feitas com ele, de qualquer status: elas guardam o desconto prometido. */
  reservas: number
  /**
   * Já usado numa compra ou preso numa reserva: o tipo, o valor, a categoria e o nível mínimo não
   * mudam mais, e ele não pode ser excluído (só desativado).
   */
  emUso: boolean
}

/** Corpo de POST /api/loja/cupons e de POST /api/shopping/cupons. */
export type PedidoCupom = Pick<
  CupomComUso,
  'titulo' | 'tipo' | 'valor' | 'categoriaAlvo' | 'nivelMinimo' | 'limitePorCliente' | 'validade'
>

/** Corpo de PUT /api/loja/cupons/{id} e /api/shopping/cupons/{id}: o que não vier fica como está. */
export type EdicaoCupom = Partial<PedidoCupom> & { ativo?: boolean }
