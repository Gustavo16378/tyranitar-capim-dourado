import { lazy, Suspense } from 'react'
import { Link, Route, Routes } from 'react-router'
import { APP_NOME } from './config'

// Conferência do design system: só em desenvolvimento, fica fora do build de produção.
const PaginaDesignSystem = import.meta.env.DEV
  ? lazy(() => import('./design-system/PaginaDesignSystem'))
  : null

// As três interfaces do site. Cada uma ganha suas telas nas próximas fases.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EmMontagem titulo={APP_NOME} />} />
      <Route path="/loja/*" element={<EmMontagem titulo="Painel da loja" />} />
      <Route path="/shopping/*" element={<EmMontagem titulo="Painel do shopping" />} />
      {PaginaDesignSystem && (
        <Route
          path="/design-system"
          element={
            <Suspense fallback={null}>
              <PaginaDesignSystem />
            </Suspense>
          }
        />
      )}
      <Route path="*" element={<NaoEncontrada />} />
    </Routes>
  )
}

function EmMontagem({ titulo }: { titulo: string }) {
  return (
    <main className="grid min-h-dvh place-content-center gap-2 p-6 text-center">
      <h1 className="text-title-lg">{titulo}</h1>
      <p className="text-ink-muted">Em montagem.</p>
    </main>
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
