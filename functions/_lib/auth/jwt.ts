// Sessão por JWT HS256 (jose), válida por 12 horas, com o perfil no payload.
import { jwtVerify, SignJWT } from 'jose'
import { ErroApi } from '../erros'

export type Perfil = 'CLIENTE' | 'LOJISTA' | 'ADMIN_SHOPPING'

export interface UsuarioSessao {
  id: string
  nome: string
  perfil: Perfil
  lojaId: string | null
}

export const VALIDADE_SEGUNDOS = 12 * 60 * 60
const PERFIS: readonly string[] = ['CLIENTE', 'LOJISTA', 'ADMIN_SHOPPING'] satisfies Perfil[]

function chave(segredo: string | undefined) {
  // Erro de configuração: vira 500 genérico no middleware, com o detalhe só no log.
  if (!segredo || segredo.length < 32) throw new Error('JWT_SECRET ausente ou com menos de 32 caracteres')
  return new TextEncoder().encode(segredo)
}

export async function emitirToken(usuario: UsuarioSessao, segredo: string | undefined, agora = new Date()) {
  const emitidoEm = Math.floor(agora.getTime() / 1000)
  return new SignJWT({ nome: usuario.nome, perfil: usuario.perfil, lojaId: usuario.lojaId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(usuario.id)
    .setIssuedAt(emitidoEm)
    .setExpirationTime(emitidoEm + VALIDADE_SEGUNDOS)
    .sign(chave(segredo))
}

/** Valida assinatura e validade. Token vencido, adulterado ou malformado: 401. */
export async function lerToken(token: string, segredo: string | undefined, agora = new Date()): Promise<UsuarioSessao> {
  const k = chave(segredo)
  try {
    const { payload } = await jwtVerify(token, k, { algorithms: ['HS256'], currentDate: agora })
    const { sub, nome, perfil, lojaId } = payload
    if (
      typeof sub !== 'string' ||
      typeof nome !== 'string' ||
      typeof perfil !== 'string' ||
      !PERFIS.includes(perfil) ||
      (lojaId !== null && typeof lojaId !== 'string')
    ) {
      throw new Error('payload fora do formato')
    }
    return { id: sub, nome, perfil: perfil as Perfil, lojaId }
  } catch {
    throw new ErroApi('NAO_AUTENTICADO', 'Sua sessão terminou ou é inválida. Entre de novo.')
  }
}
