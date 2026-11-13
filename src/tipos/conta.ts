// GET /api/me, PUT /api/me/consentimento e DELETE /api/me (docs/api.md › Área do cliente).
import type { NivelApi } from './comum'

export interface Conta {
  id: string
  nome: string
  email: string
  nivel: NivelApi
  pontos: number
  /** Se a ficha de interesses é compartilhada com as lojas (RF13). */
  compartilharFicha: boolean
}
