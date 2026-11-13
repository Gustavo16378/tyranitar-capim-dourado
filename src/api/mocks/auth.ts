// Mock de POST /api/auth/login: a sessão da Ana, a cliente de teste do seed.
import type { RespostaLogin } from '../../tipos'
import { responder } from './atraso'

export const SESSAO_DEMO: RespostaLogin = {
  token: 'mock',
  usuario: { id: 'u-ana', nome: 'Ana Souza', perfil: 'CLIENTE', lojaId: null },
}

export function entrar(): Promise<RespostaLogin> {
  return responder(SESSAO_DEMO)
}
