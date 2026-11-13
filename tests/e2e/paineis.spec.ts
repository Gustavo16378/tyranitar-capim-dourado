// Os painéis da loja e do shopping em 390, 768 e 1440 px (docs/telas.md): nenhuma tela rola para
// o lado, a navegação fica num botão Menu abaixo de 1024 px, as tabelas viram cartões e os
// formulários ficam em uma coluna no celular.
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { comToken, dados, tokenDoLojista } from './apoio'

const TELAS_DA_LOJA = ['atendimento', 'reservas', 'produtos', 'cupons', 'desempenho', 'extrato'].map((t) => `/loja/${t}`)
const TELAS_DO_SHOPPING = ['lojas', 'fidelidade', 'demanda', 'vagas', 'reembolsos'].map((t) => `/shopping/${t}`)
const TODAS = [...TELAS_DA_LOJA, ...TELAS_DO_SHOPPING]
/** Daqui para cima, a barra lateral fica sempre à vista; abaixo, a navegação abre pelo Menu. */
const BARRA_LATERAL = 1024

/** As sessões dos dois painéis, pelo login de verdade, guardadas antes de abrir a página. */
async function comSessoesDosPaineis(page: Page, request: APIRequestContext) {
  const entrar = async (conta: { email: string; senha: string }) => {
    const resposta = await request.post('/api/auth/login', { data: conta })
    expect(resposta.status()).toBe(200)
    return resposta.json()
  }
  const sessoes = { loja: await entrar(dados.lojista), shopping: await entrar(dados.admin) }
  await page.addInitScript((s) => {
    localStorage.setItem('loja.sessao', JSON.stringify(s.loja))
    localStorage.setItem('shopping.sessao', JSON.stringify(s.shopping))
  }, sessoes)
}

/** Abre uma tela do painel e espera os dados chegarem (sem esqueleto na tela). */
async function abrir(page: Page, caminho: string) {
  await page.goto(caminho)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('.animate-pulse')).toHaveCount(0)
}

/** Nem a página nem nada dentro dela rola para o lado. Devolve o que rola, para a mensagem. */
async function rolagemLateral(page: Page) {
  return page.evaluate(() => {
    const sobra = document.documentElement.scrollWidth - window.innerWidth
    const rolando = [...document.querySelectorAll('body *')]
      .filter((el) => /(auto|scroll)/.test(getComputedStyle(el).overflowX) && el.scrollWidth > el.clientWidth + 1)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`)
    return [...(sobra > 0 ? [`a página sobra ${sobra} px`] : []), ...rolando]
  })
}

/**
 * Quantas colunas de campos o formulário tem: os rótulos dos campos de texto, número, data e
 * seleção que começam em x diferentes. (O rótulo, e não o campo: um campo com "R$" na frente começa
 * mais à direita.) Caixas de marcar ficam de fora; elas se arrumam em grade de propósito.
 */
async function colunasDoFormulario(page: Page) {
  const inicios = await page
    .locator('form')
    .first()
    .evaluate((form) =>
      [...form.querySelectorAll<HTMLLabelElement>('label[for]')]
        .filter((rotulo) => {
          const campo = rotulo.control
          return campo && !(campo instanceof HTMLInputElement && ['checkbox', 'radio'].includes(campo.type))
        })
        .map((rotulo) => rotulo.getBoundingClientRect())
        .filter((caixa) => caixa.width > 0)
        .map((caixa) => Math.round(caixa.left)),
    )
  return new Set(inicios).size
}

for (const largura of [390, 768, 1440]) {
  test(`TE15: em ${largura} px, as 11 telas dos painéis não rolam para o lado`, async ({ page, request, isMobile }) => {
    test.skip(isMobile, 'as três larguras rodam uma vez, no projeto de computador')
    // Uma compra na Loja A, para o extrato ter o que mostrar.
    const compra = await request.post('/api/loja/compras', {
      headers: comToken(await tokenDoLojista(request)),
      data: { qrToken: dados.ana.qrToken, valorCentavos: 5000, cupons: [] },
    })
    expect(compra.status()).toBe(201)
    await page.setViewportSize({ width: largura, height: 900 })
    await comSessoesDosPaineis(page, request)

    for (const caminho of TODAS) {
      await abrir(page, caminho)
      expect(await rolagemLateral(page), `rolagem para o lado em ${caminho}`).toEqual([])
      const navegacao = page.getByRole('navigation', { name: 'Telas do painel' })
      if (largura < BARRA_LATERAL) {
        await expect(navegacao, `${caminho}: a navegação fica atrás do Menu`).toBeHidden()
        await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()
      } else {
        await expect(navegacao).toBeVisible()
        await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden()
      }
    }

    await test.step('extrato: cartões abaixo de 1024 px, tabela a partir daí', async () => {
      await abrir(page, '/loja/extrato')
      const cartoes = page.getByRole('list', { name: /^Compras do período/ })
      const tabela = page.getByRole('table', { name: /^Compras do período/ })
      if (largura < BARRA_LATERAL) {
        await expect(cartoes.getByRole('listitem').first()).toBeVisible()
        await expect(tabela).toBeHidden()
      } else {
        await expect(tabela).toBeVisible()
        await expect(cartoes).toBeHidden()
      }
    })

    await test.step('formulários abertos também não rolam para o lado', async () => {
      const formularios: [string, RegExp][] = [
        ['/loja/produtos', /^Novo produto$/],
        ['/loja/cupons', /^Novo cupom$/],
        ['/shopping/lojas', /^Editar/],
      ]
      for (const [caminho, botao] of formularios) {
        await abrir(page, caminho)
        await page.getByRole('button', { name: botao }).first().click()
        await expect(page.locator('form').first()).toBeVisible()
        expect(await rolagemLateral(page), `rolagem para o lado no formulário de ${caminho}`).toEqual([])
        // No celular, um campo embaixo do outro.
        if (largura < 500) expect(await colunasDoFormulario(page), `colunas no formulário de ${caminho}`).toBe(1)
      }
    })
  })
}

test('TE16: no celular, o Menu abre a navegação do painel; Esc e a escolha de uma tela fecham', async ({
  page,
  request,
  isMobile,
}) => {
  test.skip(!isMobile, 'só na tela de celular')
  await comSessoesDosPaineis(page, request)
  await abrir(page, '/shopping/lojas')
  const navegacao = page.getByRole('navigation', { name: 'Telas do painel' })
  const menu = page.getByRole('button', { name: 'Menu' })
  await expect(navegacao).toBeHidden()
  await expect(menu).toHaveAttribute('aria-expanded', 'false')

  await menu.click()
  const fechar = page.getByRole('button', { name: 'Fechar' })
  await expect(fechar).toHaveAttribute('aria-expanded', 'true')
  await expect(navegacao.getByRole('link')).toHaveCount(TELAS_DO_SHOPPING.length)
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(navegacao).toBeHidden()
  await expect(menu).toBeFocused()

  await menu.click()
  await navegacao.getByRole('link', { name: 'Reembolsos' }).click()
  await expect(page).toHaveURL(/\/shopping\/reembolsos$/)
  await expect(page.getByRole('heading', { name: 'Reembolsos', level: 1 })).toBeVisible()
  await expect(navegacao).toBeHidden()
})
