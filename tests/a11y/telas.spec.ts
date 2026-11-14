// Acessibilidade das telas principais com axe-core (docs/testes.md › TX, RNF08): nenhuma violação
// de impacto serious ou critical das regras WCAG 2.1 A e AA, nos temas claro e escuro.
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import {
  comSessaoDaAna,
  comSessaoDaCarla,
  comToken,
  dados,
  entrarNoPainelDaLoja,
  novaConversa,
  perguntarPeloTenisDaFoto,
  semSalvos,
} from '../e2e/apoio'

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
      const folha = page.getByRole('dialog', { name: 'Como você quer reservar?' })
      await expect(folha).toBeVisible()
      // O tamanho e os cupons que valem para o produto chegam depois de a folha abrir.
      await expect(folha.getByRole('group', { name: 'Tamanho' })).toBeVisible()
      await expect(folha.getByRole('group', { name: 'Cupom' })).toBeVisible()
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

    test('TX13: salvos para provar, com os corações e o aviso de salvar', async ({ page }) => {
      const { token } = await comSessaoDaAna(page)
      await semSalvos(page.request, token)
      for (const id of ['p-pulse', 'p-perfume']) {
        expect((await page.request.put(`/api/me/favoritos/${id}`, { headers: comToken(token) })).status()).toBe(204)
      }
      await page.goto('/salvos')
      await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Loja B', 'Loja A'])
      await semViolacoesGraves(page)
      // Com o coração tirado (o produto fica na lista) e o aviso.
      await page.getByRole('button', { name: 'Salvar Tênis de corrida Pulse' }).click()
      await expect(page.getByRole('button', { name: 'Salvar Tênis de corrida Pulse' })).toHaveAttribute('aria-pressed', 'false')
      await semViolacoesGraves(page)
      await semSalvos(page.request, token)
    })

    test('TX14: página da loja, com os produtos em grade', async ({ page }) => {
      await comSessaoDaAna(page)
      await page.goto('/lojas/loja-a')
      await expect(page.getByRole('heading', { level: 1, name: 'Loja A' })).toBeVisible()
      await expect(page.getByRole('article')).toHaveCount(6)
      await semViolacoesGraves(page)
    })

    test('TX15: minhas compras, na carteira e a lista inteira', async ({ page }) => {
      await comSessaoDaCarla(page)
      await page.goto('/carteira')
      await expect(page.getByRole('region', { name: 'Minhas compras' }).getByRole('listitem')).toHaveCount(3)
      await semViolacoesGraves(page)
      await page.goto('/carteira/compras')
      await expect(page.getByRole('list', { name: 'Compras' }).getByRole('listitem')).toHaveCount(10)
      await semViolacoesGraves(page)
    })

    test('TX09: minha conta, com a ficha e a folha de trocar a senha', async ({ page }) => {
      await comSessaoDaAna(page)
      await page.goto('/conta')
      await expect(page.getByRole('heading', { name: 'O que a Capi anotou' })).toBeVisible()
      await expect(page.locator('.animate-pulse')).toHaveCount(0)
      await semViolacoesGraves(page)
      await page.getByRole('button', { name: 'Trocar senha' }).click()
      await expect(page.getByRole('dialog', { name: 'Trocar a senha' })).toBeVisible()
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

    test('TX10: QR das entradas do painel do shopping', async ({ page, request }) => {
      const login = await request.post('/api/auth/login', { data: dados.admin })
      const sessao = await login.json()
      await page.addInitScript((s) => localStorage.setItem('shopping.sessao', JSON.stringify(s)), sessao)
      await page.goto('/shopping/entradas')
      await expect(page.getByRole('article')).toHaveCount(7)
      await semViolacoesGraves(page)
    })

    test('TX08: painel no celular, com o Menu aberto', async ({ page }) => {
      await entrarNoPainelDaLoja(page, '/loja/extrato')
      await page.getByRole('button', { name: 'Menu' }).click()
      await expect(page.getByRole('navigation', { name: 'Telas do painel' })).toBeVisible()
      await semViolacoesGraves(page)
    })
  })
}

// O easter egg do tirano (docs/easter-egg.md, TX11): as telas novas nos dois temas, com e sem
// movimento reduzido. No modo tirano o app usa o tema escuro em qualquer caso.
const RESPOSTA_DO_TIRANO = /GRRR\.\.\. quer dizer, oi!/

/** Liga o modo tirano pela sessão, como depois de um apagão (sem esperar o apagão de novo). */
async function comModoTirano(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('capi.tirano', JSON.stringify({ ligado: true, nivelVisto: false })))
}

for (const movimento of ['reduce', 'no-preference'] as const) {
  for (const tema of ['light', 'dark'] as const) {
    test.describe(`easter egg, tema ${tema === 'light' ? 'claro' : 'escuro'}, ${movimento === 'reduce' ? 'com' : 'sem'} movimento reduzido`, () => {
      test.use({ colorScheme: tema, reducedMotion: movimento })

      test('TX11: Capi Tirana, mapa no escuro, Loja 13, nível Tirano e Piso 13', async ({ page }) => {
        const { token } = await comSessaoDaAna(page)
        await novaConversa(page.request, token)

        await page.goto('/capi')
        await page.getByRole('textbox', { name: 'Mensagem para a Capi' }).fill('tyranitar')
        await page.getByRole('button', { name: 'Enviar', exact: true }).click()
        await expect(page.getByText(RESPOSTA_DO_TIRANO)).toBeVisible()
        await expect(page.getByRole('button', { name: 'Acordar o tirano' })).toBeVisible()
        await semViolacoesGraves(page)

        await comModoTirano(page)
        await page.goto('/mapa')
        await expect(page.getByRole('heading', { name: 'Mapa no escuro' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Entrar na Loja 13' })).toBeVisible()
        await semViolacoesGraves(page)

        await page.getByRole('button', { name: 'Entrar na Loja 13' }).click()
        await expect(page.getByRole('heading', { name: 'Tyranitar', level: 1 })).toBeVisible()
        // O letreiro terminou de acender quando a equipe acena.
        await expect(page.locator('[data-personagem="acenando"]')).toHaveCount(4)
        await semViolacoesGraves(page)

        await page.getByRole('button', { name: 'Subir para o nível Tirano' }).click()
        await expect(page.getByText('Você subiu para o nível Tirano')).toBeVisible()
        // O selo terminou de entrar: opacidade cheia e escala 1 (o GSAP deixa a matriz no fim).
        await page.waitForFunction(() => {
          const selo = document.querySelector('[data-selo-tirano]')
          if (!selo) return false
          const { opacity, transform } = getComputedStyle(selo)
          const escala = transform === 'none' ? 1 : new DOMMatrix(transform).a
          return opacity === '1' && escala === 1
        })
        await semViolacoesGraves(page)

        await page.goto('/mapa')
        const terreo = page.getByRole('tab', { name: 'Térreo' })
        for (let i = 0; i < 13; i++) await terreo.click()
        await expect(page.getByRole('tab', { name: 'Piso 13', selected: true })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Piso 13' })).toBeVisible()
        await semViolacoesGraves(page)
      })
    })
  }
}

// A aparência escolhida no seletor (TX12): com o aparelho num tema, a pessoa escolhe o outro, e a
// Minha conta e o painel (com o seletor no rodapé da barra lateral) continuam sem violação grave.
for (const aparelho of ['light', 'dark'] as const) {
  const escolhido = aparelho === 'light' ? 'Escuro' : 'Claro'
  test.describe(`aparência ${escolhido} com o aparelho no ${aparelho === 'light' ? 'claro' : 'escuro'}`, () => {
    test.use({ colorScheme: aparelho })

    test('TX12: Minha conta e painel com a aparência escolhida', async ({ page }) => {
      await comSessaoDaAna(page)
      await page.goto('/conta')
      await expect(page.getByRole('heading', { name: 'Aparência' })).toBeVisible()
      await page.getByRole('group', { name: 'Aparência' }).getByText(escolhido, { exact: true }).click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', aparelho === 'light' ? 'dark' : 'light')
      await expect(page.locator('.animate-pulse')).toHaveCount(0)
      await semViolacoesGraves(page)

      await entrarNoPainelDaLoja(page, '/loja/extrato')
      await page.getByRole('button', { name: 'Menu' }).click()
      await expect(page.getByRole('group', { name: 'Aparência' }).getByRole('radio', { name: escolhido })).toBeChecked()
      await semViolacoesGraves(page)
    })
  })
}

// O painel da loja com a reserva nova e a compra com itens (TX16 e TX17), nos dois temas: a reserva
// pendente com os formulários de confirmar (com a hora) e de recusar (com o motivo), e o caixa do
// Atendimento com produtos do catálogo, um valor em Outros, um cupom e o desconto item por item.
for (const tema of ['light', 'dark'] as const) {
  test.describe(`painel da loja, tema ${tema === 'light' ? 'claro' : 'escuro'}`, () => {
    test.use({ colorScheme: tema })

    test('TX16: reservas com uma nova, e os formulários de confirmar e de recusar', async ({ page }) => {
      // A Ana reserva uma camiseta pela API: a reserva nasce PENDENTE na Loja A.
      const { token } = await comSessaoDaAna(page)
      const criada = await page.request.post('/api/reservas', {
        headers: comToken(token),
        data: { produtoId: 'p-camiseta', quantidade: 1, formaPagamento: 'NA_LOJA', tamanho: 'M' },
      })
      expect(criada.status()).toBe(201)
      const { id } = (await criada.json()) as { id: string }

      await entrarNoPainelDaLoja(page, '/loja/reservas')
      // No celular, a lista das telas fica atrás do Menu, que leva o número das reservas novas.
      await expect(page.getByRole('button', { name: /^Menu, \d+ reservas? novas?$/ })).toBeVisible()
      const cartao = page.getByRole('article').filter({ hasText: 'Camiseta dry-fit' }).filter({ hasText: 'Nova' }).first()
      await expect(cartao.getByText('tamanho M')).toBeVisible()
      await expect(page.locator('.animate-pulse')).toHaveCount(0)
      await semViolacoesGraves(page)

      // Com o Menu aberto, o selo fica ao lado de Reservas, com o número no nome do link.
      await page.getByRole('button', { name: /^Menu/ }).click()
      await expect(page.getByRole('link', { name: /^Reservas, \d+ reservas? novas?$/ })).toBeVisible()
      await semViolacoesGraves(page)
      await page.keyboard.press('Escape')

      await cartao.getByRole('button', { name: 'Confirmar' }).click()
      await expect(cartao.getByLabel('Pronta para retirar a partir de')).toBeFocused()
      await semViolacoesGraves(page)
      await cartao.getByRole('button', { name: 'Voltar' }).click()

      await cartao.getByRole('button', { name: 'Recusar' }).click()
      await expect(cartao.getByLabel('Motivo da recusa')).toBeFocused()
      // Sem o motivo, o erro aparece no campo.
      await cartao.getByRole('button', { name: 'Recusar reserva' }).click()
      await expect(cartao.getByText('Diga o motivo em poucas palavras. O cliente vê essa frase.')).toBeVisible()
      await semViolacoesGraves(page)

      // A camiseta volta ao estoque para os próximos testes.
      const cancelada = await page.request.patch(`/api/reservas/${id}/cancelar`, { headers: comToken(token) })
      expect(cancelada.status()).toBe(200)
    })

    test('TX17: atendimento com itens na compra, um cupom e o desconto item por item', async ({ page }) => {
      await entrarNoPainelDaLoja(page)
      await page.getByRole('button', { name: 'Simular leitura' }).click()
      await expect(page.getByRole('button', { name: 'Registrar compra' })).toBeVisible()

      const busca = page.getByRole('searchbox', { name: 'Buscar no catálogo da loja' })
      await busca.fill('pulse')
      await page.getByRole('button', { name: 'Adicionar Tênis de corrida Pulse' }).click()
      await busca.fill('camiseta')
      await page.getByRole('button', { name: 'Adicionar Camiseta dry-fit' }).click()
      await page.getByRole('textbox', { name: 'Outros, sem produto' }).fill('25,00')
      await page.getByRole('button', { name: 'Adicionar valor' }).click()
      const itens = page.getByRole('list', { name: 'Itens da compra' })
      await expect(itens.getByRole('listitem')).toHaveCount(3)

      // O cupom de calçados aparece porque há um tênis. Ele pode já ter sido usado por outro teste
      // neste banco: sem ele, a tela é medida com os itens e a prévia sem desconto.
      const calcados = page.getByRole('radio', { name: /^10% em calçados/ })
      if (await calcados.count()) {
        await calcados.check()
        await expect(itens.getByRole('list', { name: 'Descontos' }).first()).toContainText('10% em calçados')
      }
      await expect(page.getByText(/^Ana ganha \d+ pontos?$/)).toBeVisible()
      await expect(itens).toHaveAttribute('aria-busy', 'false')
      await semViolacoesGraves(page)
    })
  })
}
