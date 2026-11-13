// Rotas do app do cliente. O App.tsx só inclui {rotasDoApp}; tela nova entra aqui.
import { Route } from 'react-router'
import Abertura from './Abertura'
import Capi from './Capi'
import Inicio from './Inicio'
import LayoutApp from './LayoutApp'

export const rotasDoApp = (
  <>
    <Route path="/" element={<Abertura />} />
    <Route element={<LayoutApp />}>
      <Route path="/inicio" element={<Inicio />} />
      <Route path="/capi" element={<Capi />} />
    </Route>
  </>
)
