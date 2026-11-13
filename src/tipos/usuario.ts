// POST /api/auth/login e /api/auth/cadastro (docs/api.md › Autenticação).

export type Perfil = 'CLIENTE' | 'LOJISTA' | 'ADMIN_SHOPPING'

export interface Usuario {
  id: string
  nome: string
  perfil: Perfil
  lojaId: string | null
}

export interface RespostaLogin {
  token: string
  usuario: Usuario
}
