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
  criadoEm: string
  /** Só o primeiro nome de quem avaliou. */
  autor: string
}

/** GET /api/produtos/{id}, como a rota de functions/api/produtos/[id].ts devolve. */
export interface ProdutoDetalhe extends ProdutoResumo {
  descricao: string
  atributos: Record<string, unknown>
  fotos: string[]
  /** media é null quando ainda não há avaliação. */
  avaliacao: { media: number | null; total: number }
  avaliacoes: Avaliacao[]
  /** O mesmo item (mesmo nome, vem primeiro) ou parecidos da mesma categoria em outras lojas. */
  outrasLojas: ProdutoResumo[]
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
