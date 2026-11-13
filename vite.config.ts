import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { APP_NOME } from './src/config.ts'

// Troca %APP_NOME% no index.html pelo valor de src/config.ts.
function appNome(): Plugin {
  return {
    name: 'app-nome',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replaceAll('%APP_NOME%', APP_NOME),
    },
  }
}

export default defineConfig({
  plugins: [react(), appNome()],
  server: {
    // Com `npm run dev:api` rodando, as chamadas a /api vão para as Functions.
    proxy: { '/api': 'http://localhost:8788' },
  },
})
