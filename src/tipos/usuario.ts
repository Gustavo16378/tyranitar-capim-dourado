// POST /api/auth/login e /api/auth/cadastro (docs/api.md › Autenticação).

/** Corpo de POST /api/auth/login. */
export interface PedidoLogin {
  email: string
  senha: string
}

export type Perfil = 'CLIENTE' | 'LOJISTA' | 'ADMIN_SHOPPING'

export interface Usuario {
  id: string
  nome: string
  perfil: Perfil
  /** Só lojista tem loja. */
  lojaId: string | null
}

export interface RespostaLogin {
  token: string
  usuario: Usuario
}

/** Item de GET /api/auth/demo: uma conta de demonstração (só com DEMO=1). loja: só no lojista. */
export interface ContaDeDemonstracao {
  perfil: Perfil
  nome: string
  loja: string | null
}
