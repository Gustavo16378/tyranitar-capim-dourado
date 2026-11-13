// Mock de POST /api/auth/login e POST /api/auth/demo. A conta é a da Ana, cliente de teste do
// seed. O mock não guarda senha: aceita o e-mail da Ana com qualquer senha de 8 caracteres ou
// mais (o mínimo do cadastro). A senha de verdade fica no .dev.vars de cada um.
import type { RespostaLogin } from '../../tipos'
import { falhar, responder } from './atraso'

export const EMAIL_DEMO = 'ana.souza@demo.test'

export const SESSAO_DEMO: RespostaLogin = {
  token: 'mock',
  usuario: { id: 'u-ana', nome: 'Ana Souza', perfil: 'CLIENTE', lojaId: null },
}

export function entrar(email: string, senha: string): Promise<RespostaLogin> {
  // Mesma mensagem para e-mail que não existe e senha errada, como a API.
  if (email.trim().toLowerCase() !== EMAIL_DEMO || senha.length < 8) {
    return falhar(401, 'NAO_AUTENTICADO', 'E-mail ou senha incorretos.')
  }
  return responder(SESSAO_DEMO)
}

export function entrarComDemo(): Promise<RespostaLogin> {
  return responder(SESSAO_DEMO)
}

/** Mock de POST /api/auth/cadastro: a conta nova entra logada (no mock, sem guardar nada). */
export function cadastrar(nome: string): Promise<RespostaLogin> {
  return responder({ token: 'mock', usuario: { id: 'u-novo', nome, perfil: 'CLIENTE', lojaId: null } })
}
