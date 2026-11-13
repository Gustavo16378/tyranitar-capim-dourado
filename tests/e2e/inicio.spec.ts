// Os cupons do Início (docs/telas.md › Início): no computador, setas, arrastar com o mouse e a
// roda; no celular, o dedo desliza a faixa e as setas não aparecem.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { comSessaoDaAna } from './apoio'

async function abrirCupons(page: Page) {
  await comSessaoDaAna(page)
  await page.goto('/inicio')
  const faixa = page.getByRole('region', { name: 'Cupons em oferta' })
  await expect(faixa.locator('article').first()).toBeVisible()
  return faixa
}

const posicao = (faixa: Locator) => faixa.evaluate((el) => el.scrollLeft)

test('TE11: no computador, os cupons andam pelas setas, arrastando com o mouse e pela roda', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'só na tela de computador')
  const faixa = await abrirCupons(page)
  const anterior = page.getByRole('button', { name: 'Cupons anteriores' })
  const proximo = page.getByRole('button', { name: 'Próximos cupons' })

  await test.step('setas: no começo, só a de próximo funciona', async () => {
    await expect(anterior).toBeDisabled()
    await expect(proximo).toBeEnabled()
    await proximo.click()
    await expect.poll(() => posicao(faixa)).toBeGreaterThan(0)
    await expect(anterior).toBeEnabled()
    // Uma seta para no começo de um cupom: o primeiro visível está inteiro na tela.
    await anterior.click()
    await expect.poll(() => posicao(faixa)).toBe(0)
    await expect(anterior).toBeDisabled()
  })

  await test.step('arrastar com o mouse leva a faixa junto', async () => {
    const caixa = (await faixa.boundingBox())!
    const y = caixa.y + caixa.height / 2
    await page.mouse.move(caixa.x + caixa.width - 40, y)
    await page.mouse.down()
    await page.mouse.move(caixa.x + caixa.width - 240, y, { steps: 10 })
    await page.mouse.up()
    expect(await posicao(faixa)).toBeGreaterThanOrEqual(190)
  })

  await test.step('a roda do mouse anda a faixa para o lado sem rolar a página', async () => {
    await faixa.evaluate((el) => (el.scrollLeft = 0))
    const tela = page.getByRole('main')
    const caixa = (await faixa.boundingBox())!
    await page.mouse.move(caixa.x + 120, caixa.y + caixa.height / 2)
    await page.mouse.wheel(0, 150)
    await expect.poll(() => posicao(faixa)).toBeGreaterThan(0)
    expect(await tela.evaluate((el) => el.scrollTop)).toBe(0)
  })
})

test('TE12: no celular, o dedo desliza os cupons e as setas não aparecem', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'só na tela de celular')
  const faixa = await abrirCupons(page)
  await expect(page.getByRole('button', { name: 'Próximos cupons' })).toBeHidden()

  // Um deslize de 200 px para a esquerda, com eventos de toque de verdade (CDP).
  const caixa = (await faixa.boundingBox())!
  const y = Math.round(caixa.y + caixa.height / 2)
  let x = Math.round(caixa.x + 300)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  for (let i = 0; i < 10; i++) {
    x -= 20
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(() => posicao(faixa)).toBeGreaterThan(100)
})
