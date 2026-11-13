// GET e PATCH /api/me, PUT /api/me/senha, GET /api/me/ficha, GET /api/me/dados,
// PUT /api/me/consentimento e DELETE /api/me (docs/api.md › Área do cliente).
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

/** Um interesse que a Capi anotou na ficha. O id serve para apagar (DELETE /api/me/ficha/{id}). */
export interface InteresseDaFicha {
  id: string
  categoria: string
  detalhe: string
}

/** GET /api/me/ficha: o que as lojas veem do cliente no atendimento (RN04). */
export interface FichaDoCliente {
  compartilharFicha: boolean
  interesses: InteresseDaFicha[]
  /** null: sem ficha (nada anotado, ou o compartilhamento está desligado). */
  atualizadaEm: string | null
}

/** GET /api/me/dados (LGPD): o arquivo que o cliente baixa. Só o que o app lê dele; o resto vai junto. */
export interface MeusDados {
  geradoEm: string
  conta: Conta
  [secao: string]: unknown
}
