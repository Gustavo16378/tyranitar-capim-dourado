// A aparência (TE32): Automático, Claro ou Escuro na Minha conta e no rodapé da barra lateral dos
// painéis. A escolha fica salva no aparelho, vale nas duas pontas e é aplicada antes da primeira
// pintura (o script do index.html): mesmo sem o JavaScript do app, a página já vem no tema certo.
import { expect, test, type Page } from '@playwright/test'
import { comSessaoDaAna, entrarNoPainelDaLoja } from './apoio'

/** O color-scheme que a página está usando agora (tokens.css põe um por tema). */
const esquema = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)

test('TE32: trocar a aparência e recarregar mantém o tema, no app e nos painéis', async ({ page, context }, info) => {
  const celular = info.project.name === 'e2e-celular'
  const html = page.locator('html')
  await comSessaoDaAna(page)
  await page.goto('/conta')
  const naConta = page.getByRole('group', { name: 'Aparência' })
  await expect(naConta.getByRole('radio', { name: 'Automático' })).toBeChecked()
  await expect(html).not.toHaveAttribute('data-theme')

  await test.step('Escuro fica salvo e volta ao recarregar', async () => {
    await naConta.getByText('Escuro', { exact: true }).click()
    await expect(naConta.getByRole('radio', { name: 'Escuro' })).toBeChecked()
    await expect(html).toHaveAttribute('data-theme', 'dark')
    expect(await esquema(page)).toBe('dark')
    await page.reload()
    await expect(html).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('group', { name: 'Aparência' }).getByRole('radio', { name: 'Escuro' })).toBeChecked()
  })

  await test.step('antes da primeira pintura: sem o JavaScript do app, a página já vem escura', async () => {
    const semApp = await context.newPage()
    await semApp.route(/\/assets\/.+\.js$/, (rota) => rota.abort())
    await semApp.goto('/conta')
    await expect(semApp.locator('html')).toHaveAttribute('data-theme', 'dark')
    expect(await esquema(semApp)).toBe('dark')
    await semApp.close()
  })

  await test.step('Claro vale mesmo com o aparelho no escuro; Automático volta a seguir o aparelho', async () => {
    await page.emulateMedia({ colorScheme: 'dark' })
    const grupo = page.getByRole('group', { name: 'Aparência' })
    await grupo.getByText('Claro', { exact: true }).click()
    await expect(html).toHaveAttribute('data-theme', 'light')
    expect(await esquema(page)).toBe('light')
    await grupo.getByText('Automático', { exact: true }).click()
    await expect(html).not.toHaveAttribute('data-theme')
    expect(await esquema(page)).toBe('dark')
    await page.emulateMedia({ colorScheme: 'light' })
  })

  await test.step('no painel da loja, o mesmo seletor no rodapé da barra lateral', async () => {
    await entrarNoPainelDaLoja(page, '/loja/extrato')
    const abrirMenu = async () => {
      if (celular) await page.getByRole('button', { name: 'Menu' }).click()
    }
    await abrirMenu()
    const noPainel = page.getByRole('group', { name: 'Aparência' })
    await expect(noPainel.getByRole('radio', { name: 'Automático' })).toBeChecked()
    await noPainel.getByText('Escuro', { exact: true }).click()
    await expect(html).toHaveAttribute('data-theme', 'dark')
    await page.reload()
    await expect(html).toHaveAttribute('data-theme', 'dark')
    await abrirMenu()
    await expect(page.getByRole('group', { name: 'Aparência' }).getByRole('radio', { name: 'Escuro' })).toBeChecked()
  })

  await test.step('a escolha é do aparelho: o app também fica escuro', async () => {
    await page.goto('/conta')
    await expect(html).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('group', { name: 'Aparência' }).getByRole('radio', { name: 'Escuro' })).toBeChecked()
  })
})
