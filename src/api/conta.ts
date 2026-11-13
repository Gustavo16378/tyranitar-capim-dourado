// A conta do cliente (tela Minha conta). Sem mock: as rotas existem em functions/api/me.
import type { Conta } from '../tipos'
import { sair } from './auth'
import { requisitar } from './cliente'

/** GET /api/me */
export function obterConta() {
  return requisitar<Conta>('GET', '/api/me')
}

/** PUT /api/me/consentimento: desligar apaga a ficha na hora. Devolve a conta atualizada. */
export function mudarConsentimento(compartilharFicha: boolean) {
  return requisitar<Conta>('PUT', '/api/me/consentimento', { compartilharFicha })
}

/** DELETE /api/me: exclui a conta e encerra a sessão neste aparelho. */
export async function excluirConta() {
  await requisitar<null>('DELETE', '/api/me')
  sair()
}
