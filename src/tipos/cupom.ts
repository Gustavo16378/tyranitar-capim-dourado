// Cupons em GET /api/ofertas e em GET /api/me/carteira (docs/api.md).
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
}
