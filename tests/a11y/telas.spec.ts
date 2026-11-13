// Acessibilidade das telas principais com axe-core (docs/testes.md › TX, RNF08): nenhuma violação
// de impacto serious ou critical das regras WCAG 2.1 A e AA, nos temas claro e escuro.
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { comSessaoDaAna, entrarNoPainelDaLoja, novaConversa, perguntarPeloTenisDaFoto } from '../e2e/apoio'

const GRAVES = new Set(['serious', 'critical'])

/** O que medir: a tela toda, sem os seletores de `excluir`, ou só os de `incluir`. */
interface Recorte {
  incluir?: string
  excluir?: string
}

async function semViolacoesGraves(page: Page, { incluir, excluir }: Recorte = {}) {
  // Com movimento reduzido a entrada ainda é um fade curto (src/movimento): as cores só valem
  // quando todo bloco com data-anim chegou à opacidade final.
  await page.waitForFunction(() =>
    [...document.querySelectorAll('[data-anim]')].every((el) => getComputedStyle(el).opacity === '1'),
  )
  let axe = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  if (incluir) axe = axe.include(incluir)
  if (excluir) axe = axe.exclude(excluir)
  const { violations } = await axe.analyze()
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
      // O carrossel de cupons passa da borda da tela: o cupom cortado na borda (qual é depende da
      // data, pela ordem de validade) tem o texto pela metade, e o axe erra o fundo dele. Por isso
      // a tela é medida sem o carrossel, e cada cupom depois, rolado até aparecer inteiro.
      const CARROSSEL = '[aria-label="Cupons em oferta"]'
      await semViolacoesGraves(page, { excluir: CARROSSEL })
      const cupons = page.locator(`${CARROSSEL} article`)
      expect(await cupons.count()).toBeGreaterThan(0)
      for (let i = 0; i < (await cupons.count()); i++) {
        await cupons.nth(i).evaluate((el) => el.scrollIntoView({ block: 'nearest', inline: 'center' }))
        await expect(cupons.nth(i)).toBeInViewport({ ratio: 1 })
        await semViolacoesGraves(page, { incluir: `${CARROSSEL} > div:nth-child(${i + 1})` })
      }
    })

    test('TX02: conversa com a Capi, também só pelo teclado', async ({ page }) => {
      const { token } = await comSessaoDaAna(page)
      await novaConversa(page.request, token)
      await page.goto('/capi')
      // A Capi vazia, com as sugestões; depois a conversa com a foto do tênis.
      await expect(page.getByRole('button', { name: /Tem esse tênis aí no shopping/ })).toBeVisible()
      await semViolacoesGraves(page)
      await perguntarPeloTenisDaFoto(page)
      await semViolacoesGraves(page)

      // Só com o teclado: Tab até o campo da mensagem, escrever e mandar com Enter.
      const campo = page.getByRole('textbox', { name: 'Mensagem para a Capi' })
      for (let i = 0; i < 30 && !(await campo.evaluate((el) => el === document.activeElement)); i++) {
        await page.keyboard.press('Tab')
      }
      await expect(campo).toBeFocused()
      await page.keyboard.type('perfume')
      // No celular, Enter quebra a linha: Tab até o botão de enviar e Enter nele.
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: 'Enviar', exact: true })).toBeFocused()
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
      await expect(page.getByRole('img', { name: /com a rota da entrada mais próxima até/ })).toBeVisible()
      await semViolacoesGraves(page)
    })

    test('TX06: atendimento do painel da loja, também só pelo teclado', async ({ page }) => {
      await entrarNoPainelDaLoja(page)
      await expect(page.getByRole('heading', { name: 'Atendimento', level: 1 })).toBeVisible()
      await semViolacoesGraves(page)

      // Só com o teclado: Tab até "Simular leitura" e Enter; a ficha da Ana e o caixa aparecem.
      const simular = page.getByRole('button', { name: 'Simular leitura' })
      for (let i = 0; i < 40 && !(await simular.evaluate((el) => el === document.activeElement)); i++) {
        await page.keyboard.press('Tab')
      }
      await expect(simular).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('button', { name: 'Registrar compra' })).toBeVisible()
      await semViolacoesGraves(page)
    })

    test('TX07: relatórios do painel da loja', async ({ page }) => {
      await entrarNoPainelDaLoja(page, '/loja/desempenho')
      await expect(page.getByRole('heading', { name: 'Mais vendidos' })).toBeVisible()
      await semViolacoesGraves(page)
    })
  })
}
