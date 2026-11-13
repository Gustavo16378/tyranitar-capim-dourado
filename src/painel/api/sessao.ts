// Sessão de um painel: o token do login e o usuário, guardados no navegador. Cada painel
// cria a sua com criarSessao('loja.sessao'), então dá para estar no painel da loja numa aba
// e no do shopping em outra. Quando a API responde 401, o cliente HTTP apaga a sessão e a
// guarda de perfil manda de volta para o login.
import { useSyncExternalStore } from 'react'
import type { RespostaLogin, UsuarioLogado } from '../../tipos/comum'

export interface Sessao {
  token: string
  usuario: UsuarioLogado
}

export interface ArmazemDeSessao {
  /** A sessão válida agora, ou null. Uma sessão vencida é apagada aqui. */
  lerSessao: () => Sessao | null
  gravarSessao: (resposta: RespostaLogin) => void
  apagarSessao: () => void
  /** A sessão guardada, ou null. Re-renderiza quando alguém entra ou sai. */
  useSessao: () => Sessao | null
}

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

export function criarSessao(chave: string): ArmazemDeSessao {
  const ouvintes = new Set<() => void>()

  function carregar(): Sessao | null {
    try {
      const salvo = globalThis.localStorage?.getItem(chave)
      if (!salvo) return null
      const sessao = JSON.parse(salvo) as Sessao
      return sessao.token && !tokenVencido(sessao.token) ? sessao : null
    } catch {
      return null
    }
  }

  let atual = carregar()

  function trocar(nova: Sessao | null) {
    atual = nova
    try {
      if (nova) globalThis.localStorage?.setItem(chave, JSON.stringify(nova))
      else globalThis.localStorage?.removeItem(chave)
    } catch {
      // Navegador sem armazenamento (aba anônima bloqueada): a sessão vale só nesta aba.
    }
    ouvintes.forEach((avisar) => avisar())
  }

  function assinar(avisar: () => void) {
    ouvintes.add(avisar)
    return () => ouvintes.delete(avisar)
  }

  const instantaneo = () => atual

  return {
    lerSessao() {
      if (atual && tokenVencido(atual.token)) trocar(null)
      return atual
    },
    gravarSessao({ token, usuario }) {
      trocar({ token, usuario })
    },
    apagarSessao() {
      if (atual) trocar(null)
    },
    // Um token que venceu com a tela aberta cai no primeiro 401 da API, que apaga a sessão.
    useSessao() {
      return useSyncExternalStore(assinar, instantaneo, () => null)
    },
  }
}
