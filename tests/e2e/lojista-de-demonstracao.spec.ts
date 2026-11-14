// O lojista de demonstração de cada loja (TE39): em /entrar, o botão "Lojista" abre a lista das
// lojas que têm produto, a da demonstração primeiro, e entra como o lojista da escolhida. A Ana
// reserva na Cacau Show, e a reserva aparece no painel da Cacau Show.
import { expect, test } from '@playwright/test'
import { comSessaoDaAna, comToken } from './apoio'

test('TE39: reservar na Cacau Show e ver a reserva no painel da Cacau Show, pelo "Lojista" do /entrar', async ({ page, browser, baseURL }) => {
  let reservaId = ''
  const { token } = await comSessaoDaAna(page)

  await test.step('a Ana reserva a caixa de trufas na Cacau Show', async () => {
    await page.goto('/produto/p-trufas')
    await page.getByRole('button', { name: 'Reservar' }).click()
    await page
      .getByRole('dialog', { name: 'Como você quer reservar?' })
      .getByRole('button', { name: /Pagar na loja/ })
      .click()
    await expect(page.getByRole('heading', { name: 'Reserva enviada' })).toBeVisible()
    reservaId = decodeURIComponent(new URL(page.url()).pathname.split('/').pop() ?? '')
  })

  // O painel numa janela própria, sem a sessão da Ana.
  const janela = await browser.newContext({ baseURL, viewport: { width: 1280, height: 800 } })
  const painel = await janela.newPage()

  await test.step('"Lojista" abre a lista das lojas, a da demonstração primeiro', async () => {
    await painel.goto('/entrar')
    const lojista = painel.getByRole('button', { name: 'Lojista', exact: true })
    await expect(lojista).toHaveAttribute('aria-haspopup', 'dialog')
    await lojista.click()
    const folha = painel.getByRole('dialog', { name: 'Entrar como lojista de qual loja?' })
    const lojas = folha.getByRole('list', { name: 'Lojas com conta de demonstração' }).getByRole('button')
    await expect(lojas).toHaveText(['Loja A', 'Cacau Show'])
    await lojas.filter({ hasText: 'Cacau Show' }).click()
    await expect(painel).toHaveURL(/\/loja\//)
  })

  await test.step('o painel é o da Cacau Show, com a reserva da Ana', async () => {
    await painel.goto('/loja/reservas')
    await expect(painel.getByRole('heading', { level: 1, name: 'Reservas' })).toBeVisible()
    await expect(painel.getByText('Cacau Show').first()).toBeVisible()
    await expect(painel.getByRole('article', { name: 'Caixa de trufas 250 g' }).filter({ hasText: 'Ana' }).first()).toBeVisible()
    // A Loja A não aparece aqui: a reserva do tênis de outro teste é de outra loja.
    await expect(painel.getByRole('article', { name: /Tênis/ })).toHaveCount(0)
  })

  await janela.close()
  // A reserva sai no fim: o outro projeto reserva a mesma caixa.
  expect((await page.request.patch(`/api/reservas/${reservaId}/cancelar`, { headers: comToken(token) })).status()).toBe(200)
})
