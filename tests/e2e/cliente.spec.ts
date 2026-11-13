// Jornadas do app do cliente no navegador (docs/testes.md › E2E), com o modo demonstração ligado.
// Os testes não contam com estoque nem pontos exatos: o banco é o mesmo para o celular e o
// computador, e cada jornada reserva de verdade.
import { expect, test } from '@playwright/test'
import { formatarNumero } from '../../src/componentes/formatar'
import { APP_NOME } from '../../src/config'
import {
  aba,
  comSessaoDaAna,
  comToken,
  dados,
  esperarRoteiroDaCapi,
  pontosDaAna,
  tokenDoLojista,
  tokenNaTela,
} from './apoio'

test('TE01: Capi, reserva com Pix, mapa, atendimento pelo QR e pontos na carteira', async ({ page, request }) => {
  await test.step('abertura e login com a conta de demonstração', async () => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Oi, eu sou a Capi.' })).toBeVisible()
    await page.getByRole('button', { name: 'Começar' }).click()
    await expect(page).toHaveURL(/\/entrar$/)
    await page.getByRole('button', { name: 'Entrar com a conta de demonstração' }).click()
    await expect(page).toHaveURL(/\/inicio$/)
    await expect(page.getByText(/, Ana$/)).toBeVisible()
  })
  const pontosAntes = await pontosDaAna(request, await tokenNaTela(page))

  await test.step('a Capi responde o roteiro com produtos do shopping', async () => {
    await aba(page, 'Capi').click()
    const conversa = await esperarRoteiroDaCapi(page)
    await expect(conversa.getByRole('heading', { name: /Tênis/ }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Sim, separar' }).click()
  })

  let reservaId = ''
  await test.step('reserva com Pix e pagamento simulado', async () => {
    await expect(page).toHaveURL(/\/produto\//)
    await page.getByRole('button', { name: 'Reservar' }).click()
    const folha = page.getByRole('dialog', { name: 'Como você quer reservar?' })
    await folha.getByRole('button', { name: /Pagar agora com Pix/ }).click()
    await expect(page).toHaveURL(/\/reserva\//)
    reservaId = decodeURIComponent(new URL(page.url()).pathname.split('/').pop() ?? '')
    await expect(page.getByRole('heading', { name: 'Pague com Pix' })).toBeVisible()
    await page.getByRole('button', { name: 'Já paguei' }).click()
    await expect(page.getByRole('heading', { name: 'Separado para você' })).toBeVisible()
    await expect(page.getByText('Paga', { exact: true })).toBeVisible()
  })

  await test.step('a loja separa o produto e a Ana vê o status mudar', async () => {
    // Pelas rotas do painel da loja (a tela do painel está na branch fase-4).
    const lojista = comToken(await tokenDoLojista(request))
    const separar = await request.patch(`/api/loja/reservas/${reservaId}`, {
      headers: lojista,
      data: { status: 'SEPARADA' },
    })
    expect(separar.status()).toBe(200)
    await page.reload()
    await expect(page.getByRole('listitem').filter({ hasText: 'Separada pela loja' })).toHaveAttribute(
      'aria-current',
      'step',
    )
  })

  await test.step('mapa com a rota até a loja', async () => {
    await page.getByRole('button', { name: 'Como chegar' }).click()
    await expect(page).toHaveURL(new RegExp(`/mapa\\?loja=${dados.mapaDaLojaA}$`))
    await expect(page.getByRole('heading', { name: 'Loja A' })).toBeVisible()
    await expect(page.getByRole('img', { name: /com a rota da entrada até Loja A/ })).toBeVisible()
  })

  let pontosGerados = 0
  await test.step('no balcão, a loja lê o QR da Ana e registra a retirada', async () => {
    // Pelas rotas do painel da loja. A tela do painel está na branch fase-4: quando ela entrar
    // na main, os passos da loja podem ir pela tela ("Simular leitura" e "Registrar compra").
    const lojista = comToken(await tokenDoLojista(request))
    const atendimento = await request.get(`/api/loja/atendimento/${dados.ana.qrToken}`, { headers: lojista })
    expect(atendimento.status()).toBe(200)
    const corpo = await atendimento.json()
    expect(corpo.cliente).toMatchObject({ nome: 'Ana' })
    expect(corpo.reservas).toContainEqual(expect.objectContaining({ id: reservaId, pago: true }))
    // Paga por Pix: o caixa não cobra de novo, a compra entra com o valor da reserva.
    const compra = await request.post('/api/loja/compras', {
      headers: lojista,
      data: { qrToken: dados.ana.qrToken, valorCentavos: 0, cupons: [], reservaId },
    })
    expect(compra.status()).toBe(201)
    pontosGerados = ((await compra.json()) as { pontosGerados: number }).pontosGerados
    expect(pontosGerados).toBeGreaterThan(0)
  })

  await test.step('a carteira mostra os pontos novos', async () => {
    await aba(page, 'Carteira').click()
    await expect(page.locator('[data-carteira-pontos]')).toHaveText(formatarNumero(pontosAntes + pontosGerados))
  })
})

test('TE02: pergunta à Capi e reserva para pagar na loja', async ({ page }) => {
  await comSessaoDaAna(page)
  await page.goto('/capi')
  await esperarRoteiroDaCapi(page)

  const mensagem = page.getByRole('textbox', { name: 'Mensagem para a Capi' })
  await mensagem.fill('perfume')
  await mensagem.press('Enter')
  const conversa = page.getByRole('log', { name: 'Conversa com a Capi' })
  await expect(conversa.getByRole('heading', { name: /Perfume Cerrado/ })).toBeVisible()
  await page.getByRole('button', { name: 'Sim, separar' }).click()

  await expect(page.getByRole('heading', { name: 'Perfume Cerrado 100 ml' })).toBeVisible()
  await page.getByRole('button', { name: 'Reservar' }).click()
  await page
    .getByRole('dialog', { name: 'Como você quer reservar?' })
    .getByRole('button', { name: /Pagar na loja/ })
    .click()
  await expect(page.getByRole('heading', { name: 'Separado para você' })).toBeVisible()
  await expect(page.getByText(/Expira em [34] h/)).toBeVisible()
})

test('TE07: sem sessão, ou com ela vencida, volta para o login e depois para a tela pedida', async ({ page }) => {
  await page.goto('/carteira')
  await expect(page).toHaveURL(/\/entrar$/)
  await page.getByRole('button', { name: 'Entrar com a conta de demonstração' }).click()
  await expect(page).toHaveURL(/\/carteira$/)
  await expect(page.getByRole('heading', { name: 'Sua carteira' })).toBeVisible()

  // Token que a API recusa: o app encerra a sessão e pede login de novo.
  await page.evaluate(() => {
    const sessao = JSON.parse(localStorage.getItem('sessao') ?? '{}')
    localStorage.setItem('sessao', JSON.stringify({ ...sessao, token: 'token-vencido' }))
  })
  await page.reload()
  await expect(page).toHaveURL(/\/entrar$/)
  await page.getByRole('button', { name: 'Entrar com a conta de demonstração' }).click()
  await expect(page).toHaveURL(/\/carteira$/)
})

test.describe('PWA', () => {
  test.use({ serviceWorkers: 'allow' })

  test('TE08: manifesto com o nome do app e service worker registrado', async ({ page, request }) => {
    const manifesto = await request.get('/manifest.webmanifest')
    expect(manifesto.status()).toBe(200)
    expect(await manifesto.json()).toMatchObject({
      name: APP_NOME,
      short_name: APP_NOME,
      display: 'standalone',
      icons: expect.arrayContaining([expect.objectContaining({ sizes: '512x512' })]),
    })
    await page.goto('/entrar')
    await page.waitForFunction(async () => (await navigator.serviceWorker.ready).active?.state === 'activated')
  })
})

test('TE10: no celular, as telas principais não rolam para o lado e a barra de baixo aparece', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'só na tela de celular')
  await comSessaoDaAna(page)
  for (const tela of ['/inicio', '/capi', '/produto/p-run', '/mapa', '/carteira']) {
    await page.goto(tela)
    await expect(aba(page, 'Início')).toBeInViewport()
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(sobra, `rolagem para o lado em ${tela}`).toBeLessThanOrEqual(0)
  }
})
