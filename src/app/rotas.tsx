// Rotas do app do cliente. O App.tsx só inclui {rotasDoApp}; tela nova entra aqui.
import { Route } from 'react-router'
import Abertura from './Abertura'

export const rotasDoApp = (
  <>
    <Route path="/" element={<Abertura />} />
  </>
)
