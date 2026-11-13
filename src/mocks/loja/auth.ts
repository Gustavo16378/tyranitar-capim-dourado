// POST /api/auth/login de mentira, só para lojista, e a conferência do token nas rotas /api/loja.
// O token tem o formato de um JWT (cabeçalho.payload.assinatura) com exp de 12 horas, para o
// front tratar igual ao token real. A assinatura é falsa: a API real recusa este token.
import type { Perfil, PedidoLogin, RespostaLogin } from '../../tipos/loja'
import { EMAIL_DO_LOJISTA, LOJISTA } from './dados'
import { dadosInvalidos, erro, objeto, ok, type PedidoMock, type RespostaMock } from './resposta'

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

export function entrar({ corpo }: PedidoMock): RespostaMock {
  const dados = objeto(corpo) as Partial<PedidoLogin> | null
  if (typeof dados?.email !== 'string' || typeof dados.senha !== 'string') {
    return dadosInvalidos('Informe o e-mail e a senha.')
  }
  // Mesma mensagem para e-mail desconhecido e senha errada, como a API real.
  if (!EMAIL_DO_LOJISTA.test(dados.email.trim().toLowerCase()) || dados.senha.length < 8) {
    return erro(401, 'NAO_AUTENTICADO', 'E-mail ou senha incorretos.')
  }
  const resposta: RespostaLogin = {
    token: criarTokenFalso({ sub: LOJISTA.id, perfil: LOJISTA.perfil, lojaId: LOJISTA.lojaId }),
    usuario: LOJISTA,
  }
  return ok(resposta)
}

/** Confere o token como o _middleware.ts faz: 401 sem token ou vencido, 403 com outro perfil. */
export function exigirLojista({ token }: PedidoMock): RespostaMock | null {
  const payload = token ? lerPayload(token) : null
  if (!payload || typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) {
    return erro(401, 'NAO_AUTENTICADO', 'Sua sessão acabou. Entre de novo.')
  }
  if (payload.perfil !== 'LOJISTA') {
    return erro(403, 'SEM_PERMISSAO', 'Esta conta não tem acesso ao painel da loja.')
  }
  return null
}
