import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { usePainel } from '../painel'

/**
 * Sem a sessão do perfil do painel, vai para o login único (/entrar), que volta para a mesma
 * tela depois de entrar (src/app/destinoDoLogin.ts).
 */
export function ExigirPerfil({ children }: { children: ReactNode }) {
  const painel = usePainel()
  const atual = painel.sessao.useSessao()
  const { pathname, search } = useLocation()
  if (atual?.usuario.perfil !== painel.perfil) {
    return <Navigate to="/entrar" replace state={{ de: pathname + search, perfil: painel.perfil }} />
  }
  return children
}
