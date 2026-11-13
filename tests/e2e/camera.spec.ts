// A folha da câmera da Capi (TE23 a TE26): "Tirar foto" e "Escolher da galeria". No celular,
// "Tirar foto" é o input com capture="environment" (a câmera traseira direto) e a galeria é o
// mesmo input sem capture. No computador, "Tirar foto" abre a webcam (aqui, a câmera falsa do
// Chromium); sem câmera ou com a permissão negada, a folha mostra só a galeria. Nos dois casos a
// foto fica anexada no campo e nada vai antes de tocar em enviar.
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { comSessaoDaAna, novaConversa } from './apoio'

const FOTO = join(process.cwd(), 'public', 'demo', 'print-tenis.jpg')

// A câmera falsa do Chromium, com a permissão já dada (o computador "tem" webcam).
test.use({
  launchOptions: {
    args: ['--enable-unsafe-swiftshader', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  },
  permissions: ['camera'],
})

let enviadas: string[] = []

test.beforeEach(async ({ page }) => {
  const { token } = await comSessaoDaAna(page)
  await novaConversa(page.request, token)
  enviadas = []
  page.on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/chat') enviadas.push(r.url())
  })
})

const folha = (page: Page) => page.getByRole('dialog', { name: 'Foto ou print' })

async function abrirFolha(page: Page) {
  await page.goto('/capi')
  await page.getByRole('button', { name: 'Enviar foto ou print' }).click()
  await expect(folha(page)).toBeVisible()
}

test('TE23: no celular, "Tirar foto" abre a câmera traseira e "Escolher da galeria" o seletor, e a foto fica anexada', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'só no celular')
  await abrirFolha(page)
  await expect(folha(page).getByRole('button', { name: 'Tirar foto' })).toBeVisible()
  await expect(folha(page).getByRole('button', { name: 'Escolher da galeria' })).toBeVisible()

  const [camera] = await Promise.all([
    page.waitForEvent('filechooser'),
    folha(page).getByRole('button', { name: 'Tirar foto' }).click(),
  ])
  expect(await camera.element().getAttribute('capture')).toBe('environment')
  expect(await camera.element().getAttribute('accept')).toBe('image/*')
  await camera.setFiles(FOTO)
  await expect(page.getByRole('img', { name: 'Foto anexada' })).toBeVisible()
  await expect(folha(page)).toBeHidden()

  // A galeria troca a foto anexada e não tem capture.
  await page.getByRole('button', { name: 'Enviar foto ou print' }).click()
  const [galeria] = await Promise.all([
    page.waitForEvent('filechooser'),
    folha(page).getByRole('button', { name: 'Escolher da galeria' }).click(),
  ])
  expect(await galeria.element().getAttribute('capture')).toBeNull()
  await galeria.setFiles(FOTO)
  await expect(page.getByRole('img', { name: 'Foto anexada' })).toHaveCount(1)
  expect(enviadas).toHaveLength(0)
})

test('TE24: no computador, "Tirar foto" abre a webcam e "Capturar" anexa a foto, que só vai no enviar', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'só no computador')
  await abrirFolha(page)
  await folha(page).getByRole('button', { name: 'Tirar foto' }).click()
  const webcam = page.getByRole('dialog', { name: 'Tirar foto' })
  await expect(webcam.getByLabel('Imagem da câmera')).toBeVisible()
  const capturar = webcam.getByRole('button', { name: 'Capturar' })
  await expect(capturar).toBeEnabled()
  await capturar.click()
  await expect(webcam).toBeHidden()
  await expect(page.getByRole('img', { name: 'Foto anexada' })).toBeVisible()
  expect(enviadas).toHaveLength(0)

  await page.getByRole('textbox', { name: 'Mensagem para a Capi' }).fill('Tem esse tênis no 42?')
  await page.getByRole('button', { name: 'Enviar', exact: true }).click()
  const conversa = page.getByRole('log', { name: 'Conversa com a Capi' })
  await expect(conversa.getByRole('img', { name: 'Foto que você enviou' })).toBeVisible()
  await expect(conversa.getByText('Tem esse tênis no 42?')).toBeVisible()
  expect(enviadas).toHaveLength(1)
})

test('TE25: no computador sem câmera, a folha mostra só a galeria', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'só no computador')
  // Sem câmera: nenhum dispositivo de vídeo.
  await page.addInitScript(() => {
    navigator.mediaDevices.enumerateDevices = async () => []
  })
  await abrirFolha(page)
  await expect(folha(page).getByText(/Não achei uma câmera/)).toBeVisible()
  await expect(folha(page).getByRole('button', { name: 'Tirar foto' })).toHaveCount(0)
  await expect(folha(page).getByRole('button', { name: 'Escolher da galeria' })).toBeVisible()
})

test('TE26: com a permissão da câmera negada, a folha volta só com a galeria', async ({ page, isMobile }) => {
  test.skip(isMobile, 'só no computador')
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException('Permissão negada', 'NotAllowedError')
    }
  })
  await abrirFolha(page)
  await folha(page).getByRole('button', { name: 'Tirar foto' }).click()
  await expect(folha(page).getByText(/a permissão foi negada/)).toBeVisible()
  await expect(folha(page).getByRole('button', { name: 'Tirar foto' })).toHaveCount(0)
  const [galeria] = await Promise.all([
    page.waitForEvent('filechooser'),
    folha(page).getByRole('button', { name: 'Escolher da galeria' }).click(),
  ])
  await galeria.setFiles(FOTO)
  await expect(page.getByRole('img', { name: 'Foto anexada' })).toBeVisible()
  expect(enviadas).toHaveLength(0)
})
