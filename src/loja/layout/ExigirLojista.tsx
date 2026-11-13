import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useSessao } from '../api'
import { URL_DE_ENTRAR } from '../enderecos'

/** Sem sessão de lojista, vai para o login e volta para a mesma tela depois de entrar. */
export function ExigirLojista({ children }: { children: ReactNode }) {
  const sessao = useSessao()
  const { pathname } = useLocation()
  if (sessao?.usuario.perfil !== 'LOJISTA') {
    return <Navigate to={URL_DE_ENTRAR} replace state={{ voltarPara: pathname }} />
  }
  return children
}
