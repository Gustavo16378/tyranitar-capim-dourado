// GET /api/me/carteira (docs/api.md › Área do cliente).
import type { NivelApi, Piso } from './comum'
import type { CupomCarteira } from './cupom'
import type { StatusReserva } from './reserva'

export interface Carteira {
  /** Conteúdo do QR que o vendedor lê no balcão. */
  qrToken: string
  pontos: number
  nivel: NivelApi
  /** null no nível mais alto. */
  proximoNivel: { nivel: NivelApi; faltam: number } | null
  cupons: CupomCarteira[]
  /** As reservas em aberto, as que vencem primeiro na frente. */
  reservasAtivas: ReservaNaCarteira[]
}

export interface ReservaNaCarteira {
  id: string
  /** Nome do produto. */
  produto: string
  status: StatusReserva
  pago: boolean
  tamanho: string | null
  cor: string | null
  /** O total, já com o desconto do cupom. */
  precoCentavos: number
  /** O título do cupom preso à reserva. */
  cupom: string | null
  /** ISO 8601. Confirmada pela loja: pronta para retirar a partir desta hora. */
  prontaEm: string | null
  /** ISO 8601 (UTC). */
  expiraEm: string
  /** A loja onde retirar: mapaId abre o mapa nela ("Como chegar"). */
  loja: { nome: string; piso: Piso; mapaId: string }
}
