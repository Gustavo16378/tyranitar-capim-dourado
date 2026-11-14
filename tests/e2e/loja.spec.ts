// A página da loja no app (TE31): o nome da loja no produto e no mapa abre /lojas/{id}, com o nome,
// a categoria, o piso, os produtos dela em grade e "Como chegar". (Nos cartões da Capi e nos
// salvos, o TE29.)
import { expect, test } from '@playwright/test'
import { comSessaoDaAna, dados } from './apoio'

test('TE31: a página da loja pelo nome no produto e no mapa', async ({ page }) => {
  await comSessaoDaAna(page)
  await page.goto('/produto/p-pulse')
  await page.getByRole('link', { name: 'Loja A', exact: true }).click()
  await expect(page).toHaveURL(/\/lojas\/loja-a$/)
  await expect(page).toHaveTitle(/^Loja A · /)

  const topo = page.locator('header')
  await expect(topo.getByRole('heading', { level: 1, name: 'Loja A' })).toBeVisible()
  await expect(topo.getByText('Calçados', { exact: true })).toBeVisible()
  await expect(topo.getByText('Térreo', { exact: true })).toBeVisible()

  // Os seis produtos ativos da Loja A, em grade, cada um com o coração.
  const produtos = page.getByRole('region', { name: /^Produtos/ })
  await expect(produtos.getByRole('heading', { level: 2 })).toHaveText('Produtos (6)')
  await expect(produtos.getByRole('article')).toHaveCount(6)
  await expect(produtos.getByRole('button', { name: /^Salvar / })).toHaveCount(6)
  await produtos.getByRole('link', { name: 'Tênis Run 2 preto' }).click()
  await expect(page).toHaveURL(/\/produto\/p-run$/)
  await page.goBack()

  // "Como chegar" abre o mapa na loja; no mapa, o nome dela volta para a página da loja.
  await page.getByRole('button', { name: 'Como chegar' }).click()
  await expect(page).toHaveURL(`/mapa?loja=${dados.mapaDaLojaA}`)
  await page.getByRole('heading', { level: 1 }).getByRole('link', { name: 'Loja A' }).click()
  await expect(page).toHaveURL(/\/lojas\/loja-a$/)
})

test('TE31: loja que não está no shopping', async ({ page }) => {
  await comSessaoDaAna(page)
  await page.goto('/lojas/nao-existe')
  await expect(page.getByRole('alert')).toContainText('Essa loja não está no shopping.')
  await expect(page.getByRole('button', { name: 'Tentar de novo' })).toHaveCount(0)
})

test('TE31: no mapa sem login, o nome da loja não leva ao login', async ({ page }) => {
  await page.goto(`/mapa?loja=${dados.mapaDaLojaA}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Loja A' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 }).getByRole('link')).toHaveCount(0)
})
