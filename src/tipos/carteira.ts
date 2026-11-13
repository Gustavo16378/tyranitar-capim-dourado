// GET /api/me/carteira (docs/api.md › Área do cliente).
import type { NivelApi } from './comum'
import type { Cupom } from './cupom'
import type { StatusReserva } from './reserva'

export interface Carteira {
  /** Conteúdo do QR que o vendedor lê no balcão. */
  qrToken: string
  pontos: number
  nivel: NivelApi
  /** null no nível mais alto. */
  proximoNivel: { nivel: NivelApi; faltam: number } | null
  cupons: Cupom[]
  reservasAtivas: { id: string; produto: string; status: StatusReserva }[]
}
