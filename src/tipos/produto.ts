// GET /api/produtos e GET /api/produtos/{id} (docs/api.md › Catálogo).
import type { Piso } from './comum'

export interface LojaDoProduto {
  id: string
  nome: string
  piso: Piso
  /** Id da loja na planta (SVG do mapa). */
  mapaId: string
}

/** Item da busca: GET /api/produtos → { itens: ProdutoResumo[], total }. */
export interface ProdutoResumo {
  id: string
  nome: string
  categoria: string
  precoCentavos: number
  estoque: number
  foto: string | null
  loja: LojaDoProduto
}

export interface Avaliacao {
  nota: number
  comentario: string
  criadaEm: string
}

/**
 * GET /api/produtos/{id}. O api.md só lista os campos ("atributos, fotos, média, avaliacoes e
 * outrasLojas"); os nomes abaixo são a leitura do front. Conferir com a rota da Fase 2.
 */
export interface ProdutoDetalhe extends ProdutoResumo {
  descricao: string
  atributos: Record<string, unknown>
  fotos: string[]
  /** Média das avaliações; null quando ainda não há nenhuma. */
  media: number | null
  avaliacoes: Avaliacao[]
  /** O mesmo item em outra loja (mesmoItem: true) ou um parecido (false). */
  outrasLojas: (ProdutoResumo & { mesmoItem: boolean })[]
}

export interface FiltroProdutos {
  q?: string
  categoria?: string
  loja?: string
  precoMin?: number
  precoMax?: number
  pagina?: number
  tamanho?: number
}
