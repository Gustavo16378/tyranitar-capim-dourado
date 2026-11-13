// O token dos mocks e a conferência dele, como o _middleware.ts da API faz.
// O token tem o formato de um JWT (cabeçalho.payload.assinatura) com exp de 12 horas, para o
// front tratar igual ao token real. A assinatura é falsa: a API real recusa este token.
// As rotas mockadas aceitam o token real (só leem o perfil e o exp).
import type { Perfil } from '../../tipos/comum'
import { erro, type PedidoMock, type RespostaMock } from './resposta'

const DOZE_HORAS = 12 * 60 * 60

function base64url(texto: string) {
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function lerPayload(token: string): Record<string, unknown> | null {
  try {
    const parte = token.split('.')[1] ?? ''
    return JSON.parse(atob(parte.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>
  } catch {
    return null
  }
}

export function criarTokenFalso(payload: { sub: string; perfil: Perfil; lojaId: string | null }) {
  const agora = Math.floor(Date.now() / 1000)
  const cabecalho = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const corpo = base64url(JSON.stringify({ ...payload, iat: agora, exp: agora + DOZE_HORAS }))
  return `${cabecalho}.${corpo}.assinatura-do-mock`
}

/** 401 sem token ou vencido, 403 com outro perfil; null quando pode passar. */
export function exigirPerfil({ token }: PedidoMock, perfil: Perfil, nomeDoPainel: string): RespostaMock | null {
  const payload = token ? lerPayload(token) : null
  if (!payload || typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) {
    return erro(401, 'NAO_AUTENTICADO', 'Sua sessão acabou. Entre de novo.')
  }
  if (payload.perfil !== perfil) {
    return erro(403, 'SEM_PERMISSAO', `Esta conta não tem acesso ao ${nomeDoPainel}.`)
  }
  return null
}
