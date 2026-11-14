// Minhas compras (TE30): na Carteira, abaixo das reservas, as três últimas compras com a loja, o
// dia, o valor pago, os cupons e os pontos; "Ver tudo" abre a lista inteira, dez por vez. A Carla
// tem doze compras no banco dos testes (tests/e2e/servidor.mjs).
import { expect, test } from '@playwright/test'
import { aba, comSessaoDaCarla } from './apoio'

test('TE30: Minhas compras na carteira e a lista inteira, dez por vez', async ({ page }) => {
  await comSessaoDaCarla(page)
  await page.goto('/carteira')
  const secao = page.getByRole('region', { name: 'Minhas compras' })
  const ultimas = secao.getByRole('listitem')
  await expect(ultimas).toHaveCount(3)
  // A mais nova primeiro: na Loja A, com o cupom da loja e o voucher do shopping.
  await expect(ultimas.first()).toContainText('Loja A')
  await expect(ultimas.first()).toContainText('R$ 123,91')
  await expect(ultimas.first()).toContainText('10% em calçados · −R$ 15,99')
  await expect(ultimas.first()).toContainText('R$ 20 em qualquer loja · −R$ 20,00')
  await expect(ultimas.first()).toContainText('+123 pontos')
  await expect(ultimas.nth(1)).toContainText('Loja B')
  await expect(ultimas.nth(1)).toContainText('+60 pontos')
  // Abaixo das reservas.
  const reservas = page.getByRole('heading', { name: 'Minhas reservas' })
  const compras = page.getByRole('heading', { name: 'Minhas compras' })
  expect((await reservas.boundingBox())!.y).toBeLessThan((await compras.boundingBox())!.y)

  await secao.getByRole('link', { name: 'Ver tudo (12)' }).click()
  await expect(page).toHaveURL(/\/carteira\/compras$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Minhas compras' })).toBeVisible()
  // A Carteira continua marcada na navegação.
  await expect(aba(page, 'Carteira')).toHaveAttribute('aria-current', 'page')

  const lista = page.getByRole('list', { name: 'Compras' }).getByRole('listitem')
  await expect(lista).toHaveCount(10)
  await expect(page.getByRole('status').filter({ hasText: 'Mostrando 10 de 12 compras.' })).toBeVisible()
  await page.getByRole('button', { name: 'Mostrar mais' }).click()
  await expect(lista).toHaveCount(12)
  await expect(page.getByRole('status').filter({ hasText: 'Todas as 12 compras.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mostrar mais' })).toHaveCount(0)
  // O foco vai para a primeira que chegou; a última é a mais antiga.
  await expect(lista.nth(10)).toBeFocused()
  await expect(lista.nth(11)).toContainText('R$ 160,00')

  await page.getByRole('link', { name: 'Carteira', exact: true }).first().click()
  await expect(page).toHaveURL(/\/carteira$/)
})
