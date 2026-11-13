// Sessão do usuário (token e dados do login), guardada no aparelho.
import type { RespostaLogin } from '../tipos'

const CHAVE = 'sessao'

export function lerSessao(): RespostaLogin | null {
  try {
    const texto = localStorage.getItem(CHAVE)
    return texto ? (JSON.parse(texto) as RespostaLogin) : null
  } catch {
    return null
  }
}

export function salvarSessao(sessao: RespostaLogin) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(sessao))
  } catch {
    // Sem armazenamento (aba anônima, por exemplo): a sessão vale só até recarregar.
  }
}

export function apagarSessao() {
  try {
    localStorage.removeItem(CHAVE)
  } catch {
    // Nada a apagar.
  }
}
