import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { urlNoPainel, usePainel } from '../painel'

/** Sem sessão com o perfil do painel, vai para o login e volta para a mesma tela depois de entrar. */
export function ExigirPerfil({ children }: { children: ReactNode }) {
  const painel = usePainel()
  const atual = painel.sessao.useSessao()
  const { pathname } = useLocation()
  if (atual?.usuario.perfil !== painel.perfil) {
    return <Navigate to={urlNoPainel(painel, 'entrar')} replace state={{ voltarPara: pathname }} />
  }
  return children
}
