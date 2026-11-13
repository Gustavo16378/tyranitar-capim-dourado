// O mapa aberto a qualquer visitante (TE27): ler o QR de uma entrada sem sessão abre o mapa já na
// entrada certa, sem login. Reservar, a Capi e a carteira continuam pedindo login, e o convite
// "Entrar para reservar e falar com a Capi" volta para o mesmo mapa depois de entrar.
import { expect, test } from '@playwright/test'
import { dados } from './apoio'

const CONVITE = 'Entrar para reservar e falar com a Capi'

test('TE27: ler o QR da entrada sem sessão abre o mapa na entrada certa', async ({ page }) => {
  // O QR da Entrada A, num celular sem sessão.
  await page.goto('/mapa?origem=p1-c34')
  await expect(page).toHaveURL(/\/mapa\?origem=p1-c34$/)
  await expect(page.getByText(/Você está na Entrada A\./)).toBeVisible()
  await expect(page.getByText('Você está aqui', { exact: true })).toHaveCount(1)
  await expect(page.getByRole('link', { name: CONVITE })).toBeVisible()
  // Sem a navegação do app: as outras abas pedem login.
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(0)

  // Com uma loja no link, a rota já sai da entrada do QR, sem perguntar.
  await page.goto(`/mapa?origem=p1-c1&loja=${dados.mapaDaLojaA}`)
  await expect(page.getByText('Saindo da Entrada C.')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Por qual entrada você chegou?' })).toHaveCount(0)

  // Reservar, a Capi e a carteira continuam pedindo login.
  for (const tela of ['/capi', '/carteira', '/inicio', '/produto/p-run']) {
    await page.goto(tela)
    await expect(page).toHaveURL(/\/entrar$/)
  }

  // O convite leva ao login e, depois de entrar, volta ao mesmo mapa.
  await page.goto('/mapa?origem=p1-c34')
  await page.getByRole('link', { name: CONVITE }).click()
  await expect(page).toHaveURL(/\/entrar$/)
  await page.getByRole('button', { name: 'Cliente (Ana)' }).click()
  await expect(page).toHaveURL(/\/mapa\?origem=p1-c34$/)
  await expect(page.getByText(/Você está na Entrada A\./)).toBeVisible()
  await expect(page.getByRole('link', { name: CONVITE })).toHaveCount(0)
})
