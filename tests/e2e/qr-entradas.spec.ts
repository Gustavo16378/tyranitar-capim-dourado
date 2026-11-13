// QR das entradas no painel do shopping (TE22): um QR por entrada com o link do mapa já saindo
// dela, pronto para imprimir (um por página, sem a barra lateral), e o link abrindo no lugar certo.
import { expect, test } from '@playwright/test'
import { comSessaoDaAna, dados } from './apoio'

test('TE22: QR das entradas, um por entrada, pronto para imprimir', async ({ page, request, baseURL }) => {
  const login = await request.post('/api/auth/login', { data: dados.admin })
  expect(login.status()).toBe(200)
  const sessao = await login.json()
  await page.addInitScript((s) => localStorage.setItem('shopping.sessao', JSON.stringify(s)), sessao)

  await page.goto('/shopping/entradas')
  await expect(page.getByRole('heading', { name: 'QR das entradas', level: 1 })).toBeVisible()
  const cartoes = page.getByRole('article')
  await expect(cartoes).toHaveCount(7)

  const site = new URL(baseURL!).origin
  const esperadas = [
    ['Entrada A', 'Térreo', 'p1-c34'],
    ['Entrada B', 'Térreo', 'p1-c116'],
    ['Entrada C', 'Térreo', 'p1-c1'],
    ['Entrada D', '2º piso', 'p2-c4'],
  ] as const
  for (const [nome, piso, id] of esperadas) {
    const cartao = page.getByRole('article', { name: `${nome}, ${piso}` })
    const link = `${site}/mapa?origem=${id}`
    await expect(cartao.getByRole('heading', { name: nome })).toBeVisible()
    await expect(cartao.getByText(link, { exact: true })).toBeVisible()
    // O QR é um SVG com o link no título.
    await expect(cartao.locator('svg title')).toHaveText(`QR da ${nome}: ${link}`)
  }

  // Na impressão: sem a barra lateral nem o botão, e um cartão por página.
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('navigation', { name: 'Telas do painel' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Imprimir' })).toBeHidden()
  const quebras = await cartoes.evaluateAll((els) => els.map((el) => getComputedStyle(el).breakAfter))
  expect(quebras).toEqual(Array(7).fill('page'))
  await page.emulateMedia({ media: 'screen' })

  // O link do QR da Entrada A abre o mapa do app já na entrada (a cliente entra e chega lá).
  const cliente = await page.context().browser()!.newContext()
  const celular = await cliente.newPage()
  await comSessaoDaAna(celular)
  await celular.goto(`${site}/mapa?origem=p1-c34`)
  await expect(celular.getByText(/Você está na Entrada A\./)).toBeVisible()
  await cliente.close()
})
