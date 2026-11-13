// Sessão do lojista: o token do login e o usuário, guardados no navegador do balcão.
// Uma loja de um valor só, lida pelo hook useSessao(). Quando a API responde 401, o
// cliente HTTP chama apagarSessao() e o ExigirLojista manda de volta para /loja/entrar.
import { useSyncExternalStore } from 'react'
import type { RespostaLogin, UsuarioLogado } from '../../tipos/loja'

export interface Sessao {
  token: string
  usuario: UsuarioLogado
}

const CHAVE = 'loja.sessao'
const ouvintes = new Set<() => void>()
let atual: Sessao | null = carregar()

/** Lê o payload de um JWT sem conferir a assinatura (quem confere é a API). */
export function lerPayloadDoToken(token: string): Record<string, unknown> | null {
  const parte = token.split('.')[1]
  if (!parte) return null
  try {
    const base64 = parte.replace(/-/g, '+').replace(/_/g, '/')
    const json = new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)))
    const payload: unknown = JSON.parse(json)
    return typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** O token vale 12 horas; venceu (ou não dá para ler), a sessão acabou. */
export function tokenVencido(token: string, agora = Date.now()) {
  const exp = lerPayloadDoToken(token)?.exp
  return typeof exp !== 'number' || exp * 1000 <= agora
}

function carregar(): Sessao | null {
  try {
    const salvo = globalThis.localStorage?.getItem(CHAVE)
    if (!salvo) return null
    const sessao = JSON.parse(salvo) as Sessao
    return sessao.token && !tokenVencido(sessao.token) ? sessao : null
  } catch {
    return null
  }
}

function trocar(nova: Sessao | null) {
  atual = nova
  try {
    if (nova) globalThis.localStorage?.setItem(CHAVE, JSON.stringify(nova))
    else globalThis.localStorage?.removeItem(CHAVE)
  } catch {
    // Navegador sem armazenamento (aba anônima bloqueada): a sessão vale só nesta aba.
  }
  ouvintes.forEach((avisar) => avisar())
}

/** A sessão válida agora, ou null. Uma sessão vencida é apagada aqui. */
export function lerSessao() {
  if (atual && tokenVencido(atual.token)) trocar(null)
  return atual
}

export function gravarSessao({ token, usuario }: RespostaLogin) {
  trocar({ token, usuario })
}

export function apagarSessao() {
  if (atual) trocar(null)
}

function assinar(avisar: () => void) {
  ouvintes.add(avisar)
  return () => ouvintes.delete(avisar)
}

const instantaneo = () => atual

/**
 * A sessão guardada, ou null. Re-renderiza quando alguém entra ou sai.
 * Um token que venceu com a tela aberta cai no primeiro 401 da API, que apaga a sessão.
 */
export function useSessao() {
  return useSyncExternalStore(assinar, instantaneo, () => null)
}
