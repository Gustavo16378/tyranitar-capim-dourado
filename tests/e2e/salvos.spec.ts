// Salvar com o coração e os Salvos para provar (TE33): o coração no produto e nos cartões, com o
// estado otimista e o aviso para o leitor de tela; os salvos por loja, com "Reservar" e "Como
// chegar"; o coração que volta quando a API recusa; e o coração nos cartões da Capi.
import { expect, test } from '@playwright/test'
import { aba, comSessaoDaAna, dados, idsSalvos, novaConversa, perguntarPeloTenisDaFoto, semSalvos } from './apoio'

const PULSE = 'Tênis de corrida Pulse'
// Para reservar: dez unidades, que nenhum outro teste reserva (o Pulse, com duas, esgota na jornada).
const CAMISETA = 'Camiseta dry-fit'
const PERFUME = 'Perfume Cerrado 100 ml'

test('TE33: salvar no produto, ver por loja, reservar, ir até a loja e tirar dos salvos', async ({ page }) => {
  const { token } = await comSessaoDaAna(page)
  await semSalvos(page.request, token)

  // Sem salvos, o Início leva aos Salvos para provar no lugar do "Você salvou" vazio.
  await page.goto('/inicio')
  await page.getByRole('region', { name: 'Salvos para provar' }).getByRole('link', { name: /Salvos para provar/ }).click()
  await expect(page).toHaveURL(/\/salvos$/)
  await expect(page.getByText('Você ainda não salvou nenhum produto.', { exact: false })).toBeVisible()

  // O coração do produto muda na hora, e o leitor de tela ouve o aviso.
  await page.goto('/produto/p-camiseta')
  const coracao = page.getByRole('button', { name: `Salvar ${CAMISETA}` })
  await expect(coracao).toHaveAttribute('aria-pressed', 'false')
  await coracao.click()
  await expect(coracao).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('status').filter({ hasText: `${CAMISETA} está nos seus salvos.` })).toBeAttached()
  await expect.poll(() => idsSalvos(page.request, token)).toEqual(['p-camiseta'])

  await page.goto('/produto/p-perfume')
  await page.getByRole('button', { name: `Salvar ${PERFUME}` }).click()
  await expect.poll(() => idsSalvos(page.request, token)).toEqual(['p-perfume', 'p-camiseta'])

  // A aba Salvos: uma seção por loja, a do salvo mais recente primeiro.
  await aba(page, 'Salvos').click()
  await expect(page).toHaveURL(/\/salvos$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Salvos para provar' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Loja B', 'Loja A'])
  const lojaA = page.getByRole('region', { name: 'Loja A' })
  await expect(lojaA.getByRole('article')).toHaveCount(1)
  await expect(lojaA.getByRole('link', { name: CAMISETA })).toBeVisible()

  // "Reservar" abre a folha de sempre; Esc fecha sem reservar.
  await lojaA.getByRole('button', { name: `Reservar ${CAMISETA}` }).click()
  await expect(page.getByRole('dialog', { name: 'Como você quer reservar?' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Como você quer reservar?' })).toBeHidden()

  // "Como chegar" abre o mapa na loja; o nome dela abre a página da loja.
  await lojaA.getByRole('button', { name: 'Como chegar' }).click()
  await expect(page).toHaveURL(`/mapa?loja=${dados.mapaDaLojaA}`)
  await page.goBack()
  await page.getByRole('region', { name: 'Loja A' }).getByRole('link', { name: 'Loja A' }).click()
  await expect(page).toHaveURL(/\/lojas\/loja-a$/)
  await page.goBack()

  // Tirar o coração aqui deixa o produto na lista até a próxima visita, para voltar atrás.
  const nosSalvos = page.getByRole('region', { name: 'Loja A' }).getByRole('button', { name: `Salvar ${CAMISETA}` })
  await expect(nosSalvos).toHaveAttribute('aria-pressed', 'true')
  await nosSalvos.click()
  await expect(nosSalvos).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('status').filter({ hasText: `${CAMISETA} saiu dos seus salvos.` })).toBeAttached()
  await expect.poll(() => idsSalvos(page.request, token)).toEqual(['p-perfume'])

  // O Início mostra o que ficou salvo, com o coração e "Ver todos".
  await aba(page, 'Início').click()
  const doInicio = page.getByRole('region', { name: 'Salvos para provar' })
  await expect(doInicio.getByRole('link', { name: 'Ver todos (1)' })).toBeVisible()
  await expect(doInicio.getByRole('button', { name: `Salvar ${PERFUME}` })).toHaveAttribute('aria-pressed', 'true')

  await semSalvos(page.request, token)
})

test('TE33: a API recusa e o coração volta, com o aviso na tela', async ({ page }) => {
  const { token } = await comSessaoDaAna(page)
  await semSalvos(page.request, token)
  await page.route('**/api/me/favoritos/p-pulse', (rota) =>
    rota.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ status: 503, erro: 'INDISPONIVEL', mensagem: 'Tente de novo em instantes.' }),
    }),
  )
  await page.goto('/produto/p-pulse')
  const coracao = page.getByRole('button', { name: `Salvar ${PULSE}` })
  await coracao.click()
  await expect(page.getByText(`Não deu para salvar ${PULSE}. Tente de novo em instantes.`)).toBeVisible()
  await expect(coracao).toHaveAttribute('aria-pressed', 'false')
  expect(await idsSalvos(page.request, token)).toEqual([])
})

test('TE33: o coração e o nome da loja nos cartões da Capi', async ({ page }) => {
  const { token } = await comSessaoDaAna(page)
  await semSalvos(page.request, token)
  await novaConversa(page.request, token)
  await page.goto('/capi')
  const conversa = await perguntarPeloTenisDaFoto(page)

  const cartao = conversa.getByRole('article').first()
  const nome = await cartao.getByRole('heading').innerText()
  const coracao = cartao.getByRole('button', { name: `Salvar ${nome}` })
  await coracao.click()
  await expect(coracao).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => (await idsSalvos(page.request, token)).length).toBe(1)

  // O nome da loja no cartão abre a página da loja.
  await cartao.locator('a[href^="/lojas/"]').click()
  await expect(page).toHaveURL(/\/lojas\/[^/]+$/)
  await expect(page.getByRole('button', { name: 'Como chegar' })).toBeVisible()

  await semSalvos(page.request, token)
})
