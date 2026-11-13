// Sessão do usuário (token e dados do login), guardada no aparelho. As telas acompanham com
// useSessao(): quando alguém entra, sai ou o token vence, elas redesenham.
import { useSyncExternalStore } from 'react'
import type { RespostaLogin } from '../tipos'

const CHAVE = 'sessao'
const ouvintes = new Set<() => void>()

function lerDoAparelho(): RespostaLogin | null {
  try {
    const texto = localStorage.getItem(CHAVE)
    return texto ? (JSON.parse(texto) as RespostaLogin) : null
  } catch {
    return null
  }
}

let atual = lerDoAparelho()

function mudar(sessao: RespostaLogin | null) {
  atual = sessao
  try {
    if (sessao) localStorage.setItem(CHAVE, JSON.stringify(sessao))
    else localStorage.removeItem(CHAVE)
  } catch {
    // Sem armazenamento (aba anônima, por exemplo): a sessão vale só até recarregar.
  }
  ouvintes.forEach((avisar) => avisar())
}

export function lerSessao() {
  return atual
}

export function salvarSessao(sessao: RespostaLogin) {
  mudar(sessao)
}

export function apagarSessao() {
  mudar(null)
}

/** O cliente trocou o nome (Minha conta): a sessão guardada passa a ter o nome novo. */
export function mudarNomeNaSessao(nome: string) {
  if (atual) mudar({ ...atual, usuario: { ...atual.usuario, nome } })
}

function assinar(avisar: () => void) {
  ouvintes.add(avisar)
  return () => {
    ouvintes.delete(avisar)
  }
}

/** A sessão atual (ou null), sempre em dia. */
export function useSessao() {
  return useSyncExternalStore(assinar, lerSessao, lerSessao)
}
