import { lazy, Suspense } from 'react'
import { Link, Route, Routes } from 'react-router'
import { rotasDoApp } from './app/rotas'

// Página pública do design system, carregada só quando alguém abre /design-system.
const PaginaDesignSystem = lazy(() => import('./design-system/PaginaDesignSystem'))
const RotasLoja = lazy(() => import('./loja/RotasLoja')) // painel da loja, também sob demanda
const RotasShopping = lazy(() => import('./shopping/RotasShopping')) // painel do shopping, idem

// As três interfaces do site. Cada uma ganha suas telas nas próximas fases.
export default function App() {
  return (
    <Routes>
      {rotasDoApp}
      <Route path="/loja/*" element={<Suspense fallback={null}><RotasLoja /></Suspense>} />
      <Route path="/shopping/*" element={<Suspense fallback={null}><RotasShopping /></Suspense>} />
      <Route
        path="/design-system"
        element={
          <Suspense fallback={null}>
            <PaginaDesignSystem />
          </Suspense>
        }
      />
      <Route path="*" element={<NaoEncontrada />} />
    </Routes>
  )
}

function NaoEncontrada() {
  return (
    <main className="grid min-h-dvh place-content-center gap-2 p-6 text-center">
      <h1 className="text-title-lg">Página não encontrada</h1>
      <Link to="/" className="text-label text-marrom-ink underline">
        Voltar para o início
      </Link>
    </main>
  )
}
