import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { APP_NOME } from './src/config.ts'
import tokens from './src/design-system/tokens.json' with { type: 'json' }

/** Cor de um token do tokens.json (tema claro), para onde CSS não chega: manifesto e index.html. */
function corDoToken(nome: string) {
  const token = tokens.color.tokens.find((t) => t.name === nome)
  if (!token) throw new Error(`O token de cor ${nome} não existe no tokens.json`)
  return typeof token.value === 'string' ? token.value : token.value.light
}

/** Barra do navegador e fundo da abertura do PWA: terra, como a Abertura do app. */
const COR_TERRA = corDoToken('terra')

// Troca %APP_NOME% e %COR_TERRA% no index.html pelos valores de src/config.ts e do tokens.json.
function appNome(): Plugin {
  return {
    name: 'app-nome',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replaceAll('%APP_NOME%', APP_NOME).replaceAll('%COR_TERRA%', COR_TERRA),
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    appNome(),
    // App do cliente instalável. Os PNGs de public/ saem de icone.svg e icone-maskable.svg.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icone.svg', 'apple-touch-icon.png'],
      manifest: {
        name: APP_NOME,
        short_name: APP_NOME,
        description: 'Pergunte à Capi, reserve e retire no Capim Dourado Shopping.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: COR_TERRA,
        background_color: COR_TERRA,
        icons: [
          { src: '/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icone.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // Telas abrem sem internet; a API (/api) vai sempre para a rede.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    // Com `npm run dev:api` rodando, as chamadas a /api vão para as Functions.
    proxy: { '/api': 'http://localhost:8788' },
  },
})
