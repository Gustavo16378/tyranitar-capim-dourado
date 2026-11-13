import { Navigate, Route, Routes } from 'react-router'
import { ExigirPerfil } from './layout/ExigirPerfil'
import { LayoutPainel } from './layout/LayoutPainel'
import { ContextoDoPainel, urlNoPainel, type ConfigDoPainel } from './painel'

/**
 * As rotas de um painel, montadas em <base>/* pelo App: atrás da guarda de perfil (que manda
 * para o login único, /entrar), a barra lateral com as telas. Endereço desconhecido vai para a
 * primeira.
 */
export function RotasDoPainel({ painel }: { painel: ConfigDoPainel }) {
  const inicial = urlNoPainel(painel, painel.telas[0].caminho)
  return (
    <ContextoDoPainel.Provider value={painel}>
      <Routes>
        <Route
          element={
            <ExigirPerfil>
              <LayoutPainel />
            </ExigirPerfil>
          }
        >
          {painel.telas.map(({ caminho, Tela }) => (
            <Route key={caminho} path={caminho} element={<Tela />} />
          ))}
          <Route path="*" element={<Navigate to={inicial} replace />} />
        </Route>
      </Routes>
    </ContextoDoPainel.Provider>
  )
}
