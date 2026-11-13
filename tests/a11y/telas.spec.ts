// Acessibilidade das telas principais com axe-core (docs/testes.md › TX, RNF08): nenhuma violação
// de impacto serious ou critical das regras WCAG 2.1 A e AA, nos temas claro e escuro.
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { comSessaoDaAna, esperarRoteiroDaCapi } from '../e2e/apoio'

const GRAVES = new Set(['serious', 'critical'])

async function semViolacoesGraves(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const graves = violations
    .filter((v) => GRAVES.has(v.impact ?? ''))
    .map((v) => `${v.id} (${v.impact}): ${v.help} em ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
  expect(graves).toEqual([])
}

for (const tema of ['light', 'dark'] as const) {
  test.describe(`tema ${tema === 'light' ? 'claro' : 'escuro'}`, () => {
    test.use({ colorScheme: tema })

    test('TX01: login', async ({ page }) => {
      await page.goto('/entrar')
      await expect(page.getByRole('heading', { name: 'Entre na sua conta' })).toBeVisible()
      await semViolacoesGraves(page)
    })

    test('TX03: início, com as ofertas e os produtos salvos', async ({ page }) => {
      await comSessaoDaAna(page)
      await page.goto('/inicio')
      await expect(page.getByRole('heading', { name: 'Ofertas para você' })).toBeVisible()
      await semViolacoesGraves(page)
    })

    test('TX02: conversa com a Capi, também só pelo teclado', async ({ page }) => {
      await comSessaoDaAna(page)
      await page.goto('/capi')
      await esperarRoteiroDaCapi(page)
      await semViolacoesGraves(page)

      // Só com o teclado: Tab até o campo da mensagem, escrever e mandar com Enter.
      const campo = page.getByRole('textbox', { name: 'Mensagem para a Capi' })
      for (let i = 0; i < 30 && !(await campo.evaluate((el) => el === document.activeElement)); i++) {
        await page.keyboard.press('Tab')
      }
      await expect(campo).toBeFocused()
      await page.keyboard.type('perfume')
      await page.keyboard.press('Enter')
      const conversa = page.getByRole('log', { name: 'Conversa com a Capi' })
      await expect(conversa.getByRole('heading', { name: /Perfume Cerrado/ })).toBeVisible()
    })

    test('TX04: produto e folha de reserva', async ({ page }) => {
      await comSessaoDaAna(page)
      await page.goto('/produto/p-run')
      await expect(page.getByRole('heading', { name: 'Tênis Run 2 preto' })).toBeVisible()
      await semViolacoesGraves(page)
      await page.getByRole('button', { name: 'Reservar' }).click()
      await expect(page.getByRole('dialog', { name: 'Como você quer reservar?' })).toBeVisible()
      await semViolacoesGraves(page)
    })

    test('TX05: carteira com o QR', async ({ page }) => {
      await comSessaoDaAna(page)
      await page.goto('/carteira')
      await expect(page.getByRole('img', { name: 'QR code do cliente' })).toBeVisible()
      await semViolacoesGraves(page)
    })

    test('mapa com a rota até a loja', async ({ page }) => {
      await comSessaoDaAna(page)
      await page.goto('/mapa?loja=loja-07')
      await expect(page.getByRole('img', { name: /com a rota da entrada até/ })).toBeVisible()
      await semViolacoesGraves(page)
    })

    // TX06 e TX07 são telas do painel da loja, que ainda estão na branch fase-4.
    test.fixme('TX06: atendimento do painel da loja, também só pelo teclado', async () => {})
    test.fixme('TX07: relatórios do painel da loja', async () => {})
  })
}
