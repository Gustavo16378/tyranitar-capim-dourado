import { Link, Route, Routes } from 'react-router'
import { APP_NOME } from './config'

// As três interfaces do site. Cada uma ganha suas telas nas próximas fases.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EmMontagem titulo={APP_NOME} />} />
      <Route path="/loja/*" element={<EmMontagem titulo="Painel da loja" />} />
      <Route path="/shopping/*" element={<EmMontagem titulo="Painel do shopping" />} />
      <Route path="*" element={<NaoEncontrada />} />
    </Routes>
  )
}

function EmMontagem({ titulo }: { titulo: string }) {
  return (
    <main className="grid min-h-dvh place-content-center gap-2 p-6 text-center">
      <h1 className="text-2xl font-semibold">{titulo}</h1>
      <p>Em montagem.</p>
    </main>
  )
}

function NaoEncontrada() {
  return (
    <main className="grid min-h-dvh place-content-center gap-2 p-6 text-center">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <Link to="/" className="underline">
        Voltar para o início
      </Link>
    </main>
  )
}
