import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import './design-system/tokens.css'
import './index.css'
import { instalarTirano } from './tirano'

// Easter egg: o banner do tirano no console e tyranitar() (veja src/tirano.ts).
instalarTirano(window, console)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
