// POST /api/chat (docs/api.md › Capi).
import type { Piso } from './comum'
import type { ProdutoResumo } from './produto'

/** Campos imagem e link são opcionais e excludentes. */
export interface MensagemChat {
  texto: string
  imagem?: { tipo: string; base64: string }
  link?: string
}

export type AcaoChat = { tipo: 'RESERVAR'; produtoId: string } | { tipo: 'ROTA'; mapaId: string; piso: Piso }

/**
 * Os produtos vêm no mesmo formato da busca (ProdutoResumo), para o card do chat mostrar piso e
 * estoque. A resposta pode ter parágrafos separados por linha em branco: um balão para cada.
 */
export interface RespostaChat {
  resposta: string
  produtos: ProdutoResumo[]
  acoes: AcaoChat[]
}
