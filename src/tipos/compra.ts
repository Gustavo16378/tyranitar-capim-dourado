// GET /api/me/compras e GET /api/lojas/{id} (docs/api.md › Área do cliente e Catálogo).
import type { LojaDoProduto } from './produto'

export interface CupomUsado {
  titulo: string
  descontoCentavos: number
}

/** Uma compra do histórico do cliente (Minhas compras, na Carteira). */
export interface CompraDoCliente {
  id: string
  /** ISO 8601 (UTC). */
  criadoEm: string
  loja: LojaDoProduto
  /** O que o cliente pagou, depois dos descontos. */
  valorPagoCentavos: number
  /** O maior desconto primeiro; vazia quando a compra não teve cupom. */
  cupons: CupomUsado[]
  pontosGerados: number
}

/** GET /api/lojas/{id}: a página da loja no app. */
export interface LojaAtiva extends LojaDoProduto {
  tipo: 'loja' | 'alimentacao'
  /** A primeira é a principal (a que a página mostra). */
  categorias: string[]
}
