// As correções da Capi achadas no teste como usuário real (docs/evidencias-testes.md): a tela
// vazia com sugestões que só preenchem o campo (TE17), a conversa salva ao voltar (TE18) e a
// espera com aviso e tempo limite (TE19) e a foto da câmera anexada no campo (TE21).
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { aba, comSessaoDaAna, novaConversa, PERGUNTA_DO_ROTEIRO, perguntarPeloTenisDaFoto } from './apoio'

const SUGESTOES = ['Quero um presente para minha mãe até R$ 150', 'Onde fica a Renner?', 'Tem perfume amadeirado?']
const SUGESTAO_COM_FOTO = /Tem esse tênis aí no shopping/

test.beforeEach(async ({ page }) => {
  const { token } = await comSessaoDaAna(page)
  await novaConversa(page.request, token)
})

test('TE17: a Capi abre vazia, com sugestões que só preenchem o campo, sem enviar nada', async ({ page }) => {
  const enviadas: string[] = []
  page.on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/chat') enviadas.push(r.url())
  })
  await page.goto('/capi')
  const conversa = page.getByRole('log', { name: 'Conversa com a Capi' })
  const campo = page.getByRole('textbox', { name: 'Mensagem para a Capi' })

  await expect(page.getByRole('button', { name: SUGESTAO_COM_FOTO })).toBeVisible()
  for (const sugestao of SUGESTOES) await expect(page.getByRole('button', { name: sugestao })).toBeVisible()

  // Tocar numa sugestão de texto só põe o texto no campo.
  await page.getByRole('button', { name: 'Onde fica a Renner?' }).click()
  await expect(campo).toHaveValue('Onde fica a Renner?')
  await expect(campo).toBeFocused()

  // A sugestão com foto anexa o print do tênis e troca o texto, ainda sem enviar.
  await page.getByRole('button', { name: SUGESTAO_COM_FOTO }).click()
  await expect(campo).toHaveValue(PERGUNTA_DO_ROTEIRO)
  await expect(page.getByRole('img', { name: 'Foto anexada' })).toBeVisible()
  await expect(conversa.locator(':scope > *')).toHaveCount(0)
  expect(enviadas).toHaveLength(0)

  // Enviar manda a foto e o texto juntos; as sugestões somem.
  await page.getByRole('button', { name: 'Enviar', exact: true }).click()
  await expect(conversa.getByRole('img', { name: 'Foto que você enviou' })).toBeVisible()
  await expect(conversa.getByText(PERGUNTA_DO_ROTEIRO)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sim, separar' })).toBeVisible()
  expect(enviadas).toHaveLength(1)
  await expect(page.getByRole('button', { name: 'Onde fica a Renner?' })).toHaveCount(0)
  await expect(page.getByRole('img', { name: 'Foto anexada' })).toHaveCount(0)

  // "Nova conversa" volta às sugestões.
  await page.getByRole('button', { name: 'Nova conversa' }).click()
  for (const sugestao of SUGESTOES) await expect(page.getByRole('button', { name: sugestao })).toBeVisible()
  await expect(conversa.locator(':scope > *')).toHaveCount(0)
})

test('TE18: ao voltar para a Capi, a conversa salva continua; só "Nova conversa" limpa', async ({ page }) => {
  await page.goto('/capi')
  const conversa = await perguntarPeloTenisDaFoto(page)

  // Sai para o Início e volta: a conversa vem da API, com a foto (selo) e os cartões.
  await aba(page, 'Início').click()
  await expect(page).toHaveURL(/\/inicio$/)
  await aba(page, 'Capi').click()
  await expect(conversa.getByText(PERGUNTA_DO_ROTEIRO)).toBeVisible()
  await expect(conversa.getByText('Foto enviada')).toBeVisible()
  await expect(conversa.getByRole('heading', { name: /Tênis/ }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: SUGESTAO_COM_FOTO })).toHaveCount(0)

  // Recarregar a página também não zera.
  await page.reload()
  await expect(conversa.getByText(PERGUNTA_DO_ROTEIRO)).toBeVisible()

  // "Nova conversa" apaga também no servidor: recarregando, continua vazia.
  await page.getByRole('button', { name: 'Nova conversa' }).click()
  await expect(page.getByRole('button', { name: SUGESTAO_COM_FOTO })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: SUGESTAO_COM_FOTO })).toBeVisible()
  await expect(conversa.getByText(PERGUNTA_DO_ROTEIRO)).toHaveCount(0)
})

test('TE19: a espera avisa "procurando" depois de 2 s e desiste em 25 s com "Tentar de novo"', async ({ page }) => {
  await page.clock.install()
  // A primeira resposta nunca chega: o app tem de desistir sozinho.
  let segurar = true
  await page.route('**/api/chat', async (rota) => {
    if (rota.request().method() === 'POST' && segurar) return
    await rota.continue()
  })
  await page.goto('/capi')
  await page.getByRole('button', { name: 'Tem perfume amadeirado?' }).click()
  await page.getByRole('button', { name: 'Enviar', exact: true }).click()

  const procurando = page.getByRole('status').filter({ hasText: 'A Capi está procurando nas lojas' })
  await expect(procurando).toHaveCount(0)
  await page.clock.runFor(2_100)
  await expect(procurando).toBeVisible()

  await page.clock.runFor(23_000)
  const conversa = page.getByRole('log', { name: 'Conversa com a Capi' })
  await expect(conversa.getByText(/demorando mais que o normal/)).toBeVisible()
  await expect(procurando).toHaveCount(0)

  // Tentar de novo manda a mesma mensagem (sem repetir o balão do cliente) e a Capi responde.
  segurar = false
  await page.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect(conversa.getByRole('heading', { name: /Perfume/ }).first()).toBeVisible()
  await expect(conversa.getByText('Tem perfume amadeirado?')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Tentar de novo' })).toHaveCount(0)
})

test('TE21: a foto da câmera fica anexada com prévia e um X, e só vai quando a pessoa toca em enviar', async ({ page }) => {
  const FOTO = join(process.cwd(), 'public', 'demo', 'print-tenis.jpg')
  const enviadas: string[] = []
  page.on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/chat') enviadas.push(r.url())
  })
  await page.goto('/capi')
  const campo = page.getByRole('textbox', { name: 'Mensagem para a Capi' })
  const anexada = page.getByRole('img', { name: 'Foto anexada' })
  async function escolherFoto() {
    // O botão da câmera abre a folha; "Escolher da galeria" abre o seletor de arquivo.
    await page.getByRole('button', { name: 'Enviar foto ou print' }).click()
    const [seletor] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('dialog', { name: 'Foto ou print' }).getByRole('button', { name: 'Escolher da galeria' }).click(),
    ])
    await seletor.setFiles(FOTO)
  }

  // Escolher a foto só anexa: aparece a prévia, nada vai para a Capi.
  await escolherFoto()
  await expect(anexada).toBeVisible()
  expect(enviadas).toHaveLength(0)

  // O X tira a foto.
  await page.getByRole('button', { name: 'Remover foto' }).click()
  await expect(anexada).toHaveCount(0)

  // Dá para escrever junto: o texto continua no campo quando a foto entra, e os dois vão juntos.
  await campo.fill('Tem esse tênis no 42?')
  await escolherFoto()
  await expect(anexada).toBeVisible()
  await expect(campo).toHaveValue('Tem esse tênis no 42?')
  expect(enviadas).toHaveLength(0)
  await page.getByRole('button', { name: 'Enviar', exact: true }).click()

  const conversa = page.getByRole('log', { name: 'Conversa com a Capi' })
  await expect(conversa.getByRole('img', { name: 'Foto que você enviou' })).toBeVisible()
  await expect(conversa.getByText('Tem esse tênis no 42?')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sim, separar' })).toBeVisible()
  expect(enviadas).toHaveLength(1)
  await expect(anexada).toHaveCount(0)
})
