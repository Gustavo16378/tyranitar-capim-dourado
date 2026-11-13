// Cupom como aparece em GET /api/ofertas e em GET /api/me/carteira (docs/api.md).
import type { NivelApi } from './comum'

export type TipoCupom = 'PERCENTUAL' | 'VALOR' | 'BRINDE'

/**
 * O exemplo da carteira no api.md traz { id, titulo, loja, validade }. O app precisa também de
 * tipo e valor (para o canhoto: "10%", "R$ 20") e do nível mínimo; os três são colunas da
 * tabela cupom. Cupom com loja null é voucher do shopping.
 */
export interface Cupom {
  id: string
  titulo: string
  /** Nome da loja; null quando é voucher do shopping. */
  loja: string | null
  /** Data final de uso, "2026-12-31". */
  validade: string
  tipo: TipoCupom
  /** PERCENTUAL: 1 a 100. VALOR: centavos. BRINDE: 0. */
  valor: number
  nivelMinimo: NivelApi
}
