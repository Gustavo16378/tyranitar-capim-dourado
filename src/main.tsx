import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import './design-system/tokens.css'
import './index.css'
import { ouvirOTiranoDoConsole } from './easter-egg/console'
import { aplicarTema } from './tema/aplicarTema'
import { instalarTirano } from './tirano'

// O tema da aparência escolhida (Minha conta e painéis), ou o escuro do modo tirano. O script do
// index.html já pôs o mesmo antes da primeira pintura; daqui em diante, ele acompanha as mudanças.
aplicarTema(document.documentElement)

// Easter egg: o banner do tirano no console e tyranitar() (veja src/tirano.ts), que acorda o
// tirano no app (src/easter-egg/console.ts).
instalarTirano(window, console)
ouvirOTiranoDoConsole(window)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
