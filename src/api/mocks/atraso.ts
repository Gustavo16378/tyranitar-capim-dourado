// Base dos mocks: respondem como a API (cópia dos dados, depois de um atraso de rede) e falham
// com o mesmo formato de erro { status, erro, mensagem }.
/// <reference types="vite/client" />
import { ErroApi } from '../cliente'

// Nos testes (Vitest), sem atraso.
const TESTE = import.meta.env.MODE === 'test'
const ATRASO_MS = TESTE ? 0 : 250
/** A Capi "pensa" um pouco mais que as outras rotas. */
export const ATRASO_CAPI_MS = TESTE ? 0 : 900

function esperar(ms: number) {
  return new Promise((resolver) => setTimeout(resolver, ms))
}

/** Devolve uma cópia dos dados, para a tela nunca mexer no estado do mock. */
export async function responder<T>(dados: T, ms = ATRASO_MS): Promise<T> {
  await esperar(ms)
  return structuredClone(dados)
}

export async function falhar(status: number, erro: string, mensagem: string, ms = ATRASO_MS): Promise<never> {
  await esperar(ms)
  throw new ErroApi({ status, erro, mensagem })
}
