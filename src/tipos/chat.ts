// POST /api/chat (docs/api.md › Capi).
import type { Piso } from './comum'
import type { ProdutoResumo } from './produto'
import type { FormaPagamento } from './reserva'

export type TipoDeImagem = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

/** imagem e link são opcionais e excludentes; sem eles, o texto é obrigatório. */
export interface MensagemChat {
  /** Até 1.000 caracteres. Pode ficar vazio quando vem foto ou link. */
  texto: string
  /** Foto de até 4 MB, já reduzida pelo app. */
  imagem?: { tipo: TipoDeImagem; base64: string }
  /** Endereço http ou https de um produto de outra loja. */
  link?: string
}

/** A reserva que a Capi criou quando o cliente confirmou na conversa. */
export interface ReservaCriada {
  id: string
  produtoId: string
  lojaId: string
  quantidade: number
  precoCentavos: number
  status: 'PENDENTE'
  formaPagamento: FormaPagamento
  pago: false
  expiraEm: string
}

export type AcaoChat =
  /** O primeiro cartão com estoque, para o botão de reservar. */
  | { tipo: 'RESERVAR'; produtoId: string }
  /** A Capi mostrou o caminho: o app desenha no mapa. */
  | { tipo: 'ROTA'; lojaId: string; mapaId: string; piso: Piso }
  /** Com PIX, o app abre o pagamento. */
  | { tipo: 'RESERVA_CRIADA'; reserva: ReservaCriada }

/**
 * Os produtos (no máximo 3) vêm no mesmo formato da busca, e só os que vieram das ferramentas
 * da Capi (RN14). A resposta pode ter parágrafos separados por linha em branco: um balão cada.
 */
/** Uma mensagem da conversa salva (GET /api/chat). */
export interface MensagemDoHistorico {
  id: string
  papel: 'CLIENTE' | 'CAPI'
  conteudo: string
  /** Só do cliente: a mensagem tinha foto (a imagem não é guardada). */
  foto?: boolean
  /** Só da Capi: os cartões que a resposta mostrou, dos produtos que ainda estão ativos. */
  produtos?: ProdutoResumo[]
  /** ISO 8601. */
  criadoEm: string
}

export interface HistoricoChat {
  itens: MensagemDoHistorico[]
  total: number
}

export interface RespostaChat {
  resposta: string
  produtos: ProdutoResumo[]
  acoes: AcaoChat[]
}
