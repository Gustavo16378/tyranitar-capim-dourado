// Grava o GIF da jornada do cliente para o README (docs/img/jornada.gif): a Capi acha o tênis,
// a Ana reserva com Pix, segue a rota no mapa e vê a carteira. Celular de 390 × 844, no Chromium
// do Playwright; o ffmpeg converte o vídeo em GIF de até 5 MB.
//
//   1. Suba o site com o modo demonstração e o seed (README › Modo demonstração):
//      VITE_MODO_DEMO=1 no .env.local, npm run seed:local e npm run dev:api
//   2. node scripts/gravar-jornada.mjs [endereço do site]     padrão: http://localhost:8788
//
// Precisa do ffmpeg no PATH. A jornada reserva de verdade: para gravar de novo do mesmo ponto,
// rode antes node scripts/demo-reset.mjs --local.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const SITE = process.argv[2] ?? 'http://localhost:8788'
const SAIDA = fileURLToPath(new URL('../docs/img/jornada.gif', import.meta.url))
const LIMITE = 5 * 1024 * 1024
/** Tentativas de GIF, da melhor para a mais leve, até caber no limite. */
const TENTATIVAS = [
  { fps: 10, largura: 390, cores: 128 },
  { fps: 10, largura: 390, cores: 96 },
  { fps: 10, largura: 360, cores: 64 },
  { fps: 8, largura: 320, cores: 64 },
]

const ffmpeg = spawnSync('ffmpeg', ['-version'])
if (ffmpeg.error || ffmpeg.status !== 0) {
  console.error('jornada: instale o ffmpeg e deixe no PATH')
  process.exit(1)
}

// Entra como a Ana antes de gravar, para o vídeo começar no Início.
const login = await fetch(`${SITE}/api/auth/demo`, { method: 'POST' }).catch(() => null)
if (!login?.ok) {
  console.error(`jornada: ${SITE}/api/auth/demo não respondeu. O site está de pé, com DEMO=1?`)
  process.exit(1)
}
const sessao = await login.json()
// Nova conversa: a Capi abre vazia, com as sugestões.
await fetch(`${SITE}/api/chat`, { method: 'DELETE', headers: { Authorization: `Bearer ${sessao.token}` } })

const pasta = mkdtempSync(join(tmpdir(), 'jornada-'))
const navegador = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const contexto = await navegador.newContext({
  baseURL: SITE,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'pt-BR',
  timezoneId: 'America/Araguaina',
  colorScheme: 'light',
  serviceWorkers: 'block',
  // O vídeo grava a tela em pixels CSS; o Chromium reduz o desenho em 2x, com o texto suave.
  recordVideo: { dir: pasta, size: { width: 390, height: 844 } },
})
await contexto.addInitScript((valor) => localStorage.setItem('sessao', JSON.stringify(valor)), sessao)
// Marca cada toque com um círculo dourado, para quem assiste ver onde a Ana tocou. Roda na página.
await contexto.addInitScript(() => {
  /* global document, requestAnimationFrame */
  document.addEventListener(
    'pointerdown',
    (evento) => {
      const marca = document.createElement('div')
      Object.assign(marca.style, {
        position: 'fixed',
        left: `${evento.clientX - 22}px`,
        top: `${evento.clientY - 22}px`,
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: 'color-mix(in srgb, var(--ouro) 45%, transparent)',
        border: '2px solid var(--ouro)',
        pointerEvents: 'none',
        zIndex: '2147483647',
        transition: 'transform 450ms ease-out, opacity 450ms ease-out',
      })
      document.body.append(marca)
      requestAnimationFrame(() => {
        marca.style.transform = 'scale(1.6)'
        marca.style.opacity = '0'
      })
      setTimeout(() => marca.remove(), 600)
    },
    true,
  )
})

const pagina = await contexto.newPage()
const pausa = (ms) => pagina.waitForTimeout(ms)
/** Rola com suavidade até o elemento e toca nele. */
async function tocar(alvo) {
  await alvo.waitFor()
  await alvo.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  await pausa(700)
  await alvo.click()
}
const aba = (nome) =>
  pagina.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: nome })

const comeco = Date.now()
await pagina.goto('/inicio')
await pagina.getByRole('heading', { name: 'O que você procura hoje?' }).waitFor()
// O vídeo começa na página em branco: o GIF corta até aqui.
const corte = (Date.now() - comeco) / 1000
await pausa(1800)

// Na Capi vazia, a sugestão com a foto do tênis anexa o print e põe a pergunta no campo; a Ana
// envia e a Capi oferece separar um par.
await tocar(aba('Capi'))
await tocar(pagina.getByRole('button', { name: /Tem esse tênis aí no shopping/ }))
await pagina.getByRole('img', { name: 'Foto anexada' }).waitFor()
await pausa(1200)
await tocar(pagina.getByRole('button', { name: 'Enviar', exact: true }))
await pagina.getByRole('button', { name: 'Sim, separar' }).waitFor({ timeout: 30_000 })
await pausa(2200)
await tocar(pagina.getByRole('button', { name: 'Sim, separar' }))

// Reserva com Pix e o pagamento simulado.
await pausa(1500)
await tocar(pagina.getByRole('button', { name: 'Reservar' }))
await pausa(1000)
await tocar(pagina.getByRole('dialog', { name: 'Como você quer reservar?' }).getByRole('button', { name: /Pix/ }))
await pagina.getByRole('heading', { name: 'Pague com Pix' }).waitFor()
await pausa(1500)
await tocar(pagina.getByRole('button', { name: 'Já paguei' }))
await pagina.getByRole('heading', { name: 'Separado para você' }).waitFor()
await pausa(2000)

// A rota até a loja no mapa 3D.
await tocar(pagina.getByRole('button', { name: 'Como chegar' }))
await pagina.getByRole('img', { name: /rota/ }).waitFor()
await pausa(3500)

// A carteira: o QR do balcão, os pontos e o nível.
await tocar(aba('Carteira'))
await pagina.locator('[data-carteira-pontos]').waitFor()
await pausa(3500)

const video = pagina.video()
await contexto.close()
await navegador.close()
const arquivo = await video.path()

let tamanho = 0
for (const { fps, largura, cores } of TENTATIVAS) {
  const filtro =
    `fps=${fps},scale=${largura}:-1:flags=lanczos,split[a][b];` +
    `[a]palettegen=max_colors=${cores}:stats_mode=diff[p];` +
    `[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`
  const r = spawnSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-ss', corte.toFixed(2), '-i', arquivo, '-vf', filtro, '-loop', '0', SAIDA],
    {
      stdio: 'inherit',
    },
  )
  if (r.status !== 0) {
    console.error('jornada: o ffmpeg falhou')
    process.exit(1)
  }
  tamanho = statSync(SAIDA).size
  console.log(`jornada: ${largura} px, ${fps} fps, ${cores} cores: ${(tamanho / 1024 / 1024).toFixed(2)} MB`)
  if (tamanho <= LIMITE) break
}
rmSync(pasta, { recursive: true, force: true })
if (tamanho > LIMITE) {
  console.error('jornada: o GIF passou de 5 MB mesmo na tentativa mais leve; encurte as pausas')
  process.exit(1)
}
console.log(`jornada: ${SAIDA}`)
