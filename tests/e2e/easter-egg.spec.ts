// O easter egg "O tirano da sexta-feira 13" (docs/easter-egg.md, TE30), no celular, como na
// apresentação: "tyranitar" na Capi (sem chamar a IA), o apagão, o mapa no escuro, a Loja 13, o
// nível Tirano na carteira e "Acender as luzes" voltando tudo ao normal. O TE31 acorda o tirano
// pelo tyranitar() do console (src/tirano.ts).
import { expect, test } from '@playwright/test'
import { comSessaoDaAna, novaConversa } from './apoio'

const RESPOSTA =
  'GRRR... quer dizer, oi! Ontem foi sexta-feira 13 e eu acordei de mau humor. Quer ver o que acontece quando o tirano acorda?'
const LOJISTAS = ['Gustavo Barbosa Lima', 'Gustavo Ferreira', 'Kauã', 'Diogo']
const ORIENTADORES = ['Haroldo Soares', 'Paulo Rafael']

test('TE30: de "tyranitar" na Capi ao nível Tirano, e "Acender as luzes" volta tudo ao normal', async ({ page }, info) => {
  test.skip(info.project.name !== 'e2e-celular', 'O roteiro do easter egg é no celular, como na apresentação.')
  const { token } = await comSessaoDaAna(page)
  await novaConversa(page.request, token)
  const paraAIA: string[] = []
  page.on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/chat') paraAIA.push(r.postData() ?? '')
  })

  await test.step('a Capi Tirana responde "tyranitar" sem chamar a IA', async () => {
    await page.goto('/capi')
    await page.getByRole('textbox', { name: 'Mensagem para a Capi' }).fill('TyRaNiTaR')
    await page.getByRole('button', { name: 'Enviar', exact: true }).click()
    const conversa = page.getByRole('log', { name: 'Conversa com a Capi' })
    await expect(conversa.getByText(RESPOSTA)).toBeVisible()
    await expect(conversa.getByRole('img', { name: 'Capi Tirana' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Capi Tirana', level: 1 })).toBeVisible()
    expect(paraAIA).toEqual([])
  })

  await test.step('o apagão leva ao mapa no escuro, com a trilha até a Loja 13', async () => {
    await page.getByRole('button', { name: 'Acordar o tirano' }).click()
    await expect(page.locator('[data-apagao]')).toBeAttached()
    await expect(page).toHaveURL(/\/mapa$/)
    await expect(page.getByRole('heading', { name: 'Mapa no escuro' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('img', { name: /no escuro, com uma trilha de rachaduras da Entrada B até a Loja 13/ })).toBeVisible()
    await expect(page.locator('[aria-hidden="true"] span', { hasText: /^Loja 13$/ })).toBeVisible()
    await expect(page.locator('[data-apagao]')).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Modo tirano' })).toBeVisible()
  })

  await test.step('a Loja 13 tem o letreiro e os créditos da equipe', async () => {
    await page.getByRole('button', { name: 'Entrar na Loja 13' }).click()
    await expect(page).toHaveURL(/\/loja-13$/)
    await expect(page.getByRole('heading', { name: 'Tyranitar', level: 1 })).toBeVisible()
    for (const nome of LOJISTAS) await expect(page.getByRole('heading', { name: nome, level: 3 })).toBeVisible()
    for (const nome of ORIENTADORES) await expect(page.getByText(nome, { exact: true })).toBeVisible()
    // A equipe para de ter medo e acena; sem os PNGs, cada um aparece pela inicial.
    await expect(page.locator('[data-personagem="acenando"]')).toHaveCount(4)
    await expect(page.locator('[data-personagem="acenando"]').first()).toHaveText('G')
  })

  const cartao = page.getByRole('region', { name: 'Carteira' })
  await test.step('o nível Tirano sobe na carteira, com o cupom TYRANITAR13', async () => {
    await page.getByRole('button', { name: 'Subir para o nível Tirano' }).click()
    await expect(page).toHaveURL(/\/carteira$/)
    await expect(page.getByRole('status').filter({ hasText: 'Você subiu para o nível Tirano' })).toBeVisible()
    await expect(cartao.getByText('Nível Tirano')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'TYRANITAR13' })).toBeVisible()
    await expect(page.getByText('Loja 13 · cupom de demonstração · até acender as luzes')).toBeVisible()
  })

  await test.step('a sessão lembra o modo tirano, e a subida de nível não se repete', async () => {
    await page.reload()
    await expect(cartao.getByText('Nível Tirano')).toBeVisible()
    await expect(page.getByText('Você subiu para o nível Tirano')).toHaveCount(0)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  await test.step('"Acender as luzes" volta tudo ao normal', async () => {
    await page.getByRole('button', { name: 'Acender as luzes' }).click()
    await expect(page.getByRole('region', { name: 'Modo tirano' })).toHaveCount(0)
    await expect(cartao.getByText('Nível Tirano')).toHaveCount(0)
    await expect(cartao.getByText(/^Nível (Semente|Broto|Capim|Dourado)$/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'TYRANITAR13' })).toHaveCount(0)
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark')
    // A Loja 13 deixa de existir, o mapa volta a ser o de sempre e a Capi também.
    await page.goto('/loja-13')
    await expect(page).toHaveURL(/\/inicio$/)
    await page.goto('/mapa')
    await expect(page.getByRole('heading', { name: 'Mapa', exact: true })).toBeVisible()
    await page.goto('/capi')
    await expect(page.getByRole('heading', { name: 'Capi', exact: true, level: 1 })).toBeVisible()
    // O tirano não foi para a conversa salva: a Capi abre vazia.
    await expect(page.getByRole('button', { name: /Tem esse tênis aí no shopping/ })).toBeVisible()
    expect(paraAIA).toEqual([])
  })
})

test('TE31: tyranitar() no console acorda o tirano no app', async ({ page }, info) => {
  test.skip(info.project.name !== 'e2e-computador', 'O console é coisa do computador.')
  await comSessaoDaAna(page)
  await page.goto('/inicio')
  await expect(page.getByRole('heading', { name: 'O que você procura hoje?' })).toBeVisible()
  const resposta = await page.evaluate(() => (window as unknown as { tyranitar: () => string }).tyranitar())
  expect(resposta).toBe('O tirano acordou.')
  // O mesmo apagão do botão da Capi, até o mapa no escuro.
  await expect(page.locator('[data-apagao]')).toBeAttached()
  await expect(page).toHaveURL(/\/mapa$/)
  await expect(page.getByRole('heading', { name: 'Mapa no escuro' })).toBeVisible()
  await page.getByRole('button', { name: 'Acender as luzes' }).click()
  await expect(page.getByRole('heading', { name: 'Mapa', exact: true })).toBeVisible()
})
