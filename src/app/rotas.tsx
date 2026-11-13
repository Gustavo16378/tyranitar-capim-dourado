// Rotas do app do cliente. O App.tsx só inclui {rotasDoApp}; tela nova entra aqui.
import { Navigate, Route } from 'react-router'
import Capi from './Capi'
import Carteira from './Carteira'
import Entrar from './Entrar'
import Inicio from './Inicio'
import LayoutApp from './LayoutApp'
import Mapa from './MapaSobDemanda'
import PortaDoApp from './PortaDoApp'
import Produto from './Produto'
import Reserva from './Reserva'

// Todas passam pela PortaDoApp: a cada carregamento do app, a Abertura vem antes da tela pedida.
export const rotasDoApp = (
  <Route element={<PortaDoApp />}>
    <Route path="/" element={<Navigate to="/inicio" replace />} />
    <Route path="/entrar" element={<Entrar />} />
    <Route element={<LayoutApp />}>
      <Route path="/inicio" element={<Inicio />} />
      <Route path="/capi" element={<Capi />} />
      <Route path="/produto/:id" element={<Produto />} />
      <Route path="/reserva/:id" element={<Reserva />} />
      <Route path="/mapa" element={<Mapa />} />
      <Route path="/carteira" element={<Carteira />} />
    </Route>
  </Route>
)
