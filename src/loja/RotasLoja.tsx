// Rotas do painel da loja, montadas em /loja/* pelo App. Carregado sob demanda: quem
// abre o app do cliente não baixa o painel.
import { Navigate, Route, Routes } from 'react-router'
import { ExigirLojista } from './layout/ExigirLojista'
import { LayoutLoja } from './layout/LayoutLoja'
import { URL_INICIAL } from './enderecos'
import { TELAS_DA_LOJA } from './navegacao'
import { TelaEntrar } from './telas/entrar/TelaEntrar'

export default function RotasLoja() {
  return (
    <Routes>
      <Route path="entrar" element={<TelaEntrar />} />
      <Route
        element={
          <ExigirLojista>
            <LayoutLoja />
          </ExigirLojista>
        }
      >
        {TELAS_DA_LOJA.map(({ caminho, Tela }) => (
          <Route key={caminho} path={caminho} element={<Tela />} />
        ))}
        <Route path="*" element={<Navigate to={URL_INICIAL} replace />} />
      </Route>
    </Routes>
  )
}
