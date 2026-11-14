// GET /api/me/notificacoes e POST /api/me/notificacoes/lidas (docs/api.md › Área do cliente).

export type TipoDeNotificacao = 'RESERVA' | 'CUPOM' | 'PONTOS' | 'SISTEMA'

/** Um aviso do app: cada mudança da reserva, os pontos de uma compra. */
export interface Notificacao {
  id: string
  tipo: TipoDeNotificacao
  titulo: string
  corpo: string
  /** A tela que o aviso abre (/reserva/{id}, /carteira); null quando não abre nada. */
  destino: string | null
  lida: boolean
  /** ISO 8601. */
  criadoEm: string
}

export interface Notificacoes {
  itens: Notificacao[]
  /** Os não lidos: no total (o selo do Início) e das reservas (o selo da Carteira). */
  naoLidas: { total: number; reservas: number }
}
