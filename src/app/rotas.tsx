// Rotas do app do cliente. O App.tsx só inclui {rotasDoApp}; tela nova entra aqui.
import { Route } from 'react-router'
import Abertura from './Abertura'
import Capi from './Capi'
import Inicio from './Inicio'
import LayoutApp from './LayoutApp'
import Mapa from './Mapa'
import Produto from './Produto'
import Reserva from './Reserva'

export const rotasDoApp = (
  <>
    <Route path="/" element={<Abertura />} />
    <Route element={<LayoutApp />}>
      <Route path="/inicio" element={<Inicio />} />
      <Route path="/capi" element={<Capi />} />
      <Route path="/produto/:id" element={<Produto />} />
      <Route path="/reserva/:id" element={<Reserva />} />
      <Route path="/mapa" element={<Mapa />} />
    </Route>
  </>
)
