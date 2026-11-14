// Rotas do app do cliente. O App.tsx só inclui {rotasDoApp}; tela nova entra aqui.
import { Navigate, Route } from 'react-router'
import Loja13 from '../easter-egg/Loja13SobDemanda'
import Cadastro from './Cadastro'
import Capi from './Capi'
import Carteira from './Carteira'
import Compras from './Compras'
import Entrar from './Entrar'
import Inicio from './Inicio'
import LayoutApp from './LayoutApp'
import Mapa from './MapaSobDemanda'
import MinhaConta from './MinhaConta'
import PaginaDaLoja from './PaginaDaLoja'
import PortaDoApp from './PortaDoApp'
import Produto from './Produto'
import Reserva from './Reserva'
import Salvos from './Salvos'

// Todas passam pela PortaDoApp: a cada carregamento do app, a Abertura vem antes da tela pedida.
export const rotasDoApp = (
  <Route element={<PortaDoApp />}>
    <Route path="/" element={<Navigate to="/inicio" replace />} />
    <Route path="/entrar" element={<Entrar />} />
    <Route path="/cadastro" element={<Cadastro />} />
    <Route element={<LayoutApp />}>
      <Route path="/inicio" element={<Inicio />} />
      <Route path="/salvos" element={<Salvos />} />
      <Route path="/capi" element={<Capi />} />
      <Route path="/produto/:id" element={<Produto />} />
      {/* /loja/* é o painel do lojista: a página da loja no app fica no plural. */}
      <Route path="/lojas/:id" element={<PaginaDaLoja />} />
      <Route path="/reserva/:id" element={<Reserva />} />
      <Route path="/mapa" element={<Mapa />} />
      <Route path="/carteira" element={<Carteira />} />
      <Route path="/carteira/compras" element={<Compras />} />
      <Route path="/conta" element={<MinhaConta />} />
      <Route path="/loja-13" element={<Loja13 />} />
    </Route>
  </Route>
)
