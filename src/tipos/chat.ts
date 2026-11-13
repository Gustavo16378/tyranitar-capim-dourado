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
 * O exemplo do api.md traz o produto com { id, nome, precoCentavos, loja: { nome, mapaId } }.
 * O card do chat mostra também piso e estoque, então o app espera o mesmo formato da busca
 * (ProdutoResumo), que é o que as ferramentas da Capi já leem do banco.
 */
export interface RespostaChat {
  resposta: string
  produtos: ProdutoResumo[]
  acoes: AcaoChat[]
}
