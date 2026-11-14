// Reservar pela Capi (TE38): a Capi não reserva sozinha, nem quando o cliente diz "sim". Ela mostra
// o cartão do produto com o "Reservar", que abre na conversa a mesma folha de reserva da tela do
// produto. Reservar de novo o mesmo item (mesmo tamanho) mostra a reserva que já existe, com o link.
import { expect, test, type Page } from '@playwright/test'
import { comSessaoDaAna, comToken, novaConversa, perguntarPeloTenisDaFoto } from './apoio'

/** As reservas em aberto da Ana, pela carteira. */
async function reservasEmAberto(page: Page, token: string) {
  const resposta = await page.request.get('/api/me/carteira', { headers: comToken(token) })
  return ((await resposta.json()) as { reservasAtivas: { id: string }[] }).reservasAtivas.map((r) => r.id)
}

/** Na folha de reservar: o tamanho pelo rótulo (o rádio fica sob ele) e pagar na loja. */
async function reservarNaFolha(page: Page, tamanho: string) {
  const folha = page.getByRole('dialog', { name: 'Como você quer reservar?' })
  await expect(folha).toBeVisible()
  const grupo = folha.getByRole('group', { name: 'Tamanho' })
  await grupo.locator('label').filter({ has: page.getByRole('radio', { name: tamanho, exact: true }) }).click()
  await folha.getByRole('button', { name: /Pagar na loja/ }).click()
  return folha
}

test('TE38: a Capi mostra o "Reservar" no cartão, a folha abre na conversa, e a mesma reserva não sai duas vezes', async ({
  page,
}) => {
  const { token } = await comSessaoDaAna(page)
  await novaConversa(page.request, token)
  const antes = await reservasEmAberto(page, token)

  await page.goto('/capi')
  const conversa = await perguntarPeloTenisDaFoto(page)

  await test.step('o "sim" do cliente não cria reserva: a Capi não reserva', async () => {
    const mensagens = conversa.locator(':scope > *')
    const quantas = await mensagens.count()
    await page.getByRole('textbox', { name: 'Mensagem para a Capi' }).fill('Sim, pode reservar o primeiro')
    await page.getByRole('button', { name: 'Enviar', exact: true }).click()
    await expect(conversa.getByText('Sim, pode reservar o primeiro')).toBeVisible()
    // A resposta chega (a mensagem do cliente e a da Capi) e nenhuma reserva nova aparece.
    await expect.poll(() => mensagens.count(), { timeout: 30_000 }).toBeGreaterThan(quantas + 1)
    expect(await reservasEmAberto(page, token)).toEqual(antes)
  })

  const reservar = conversa.getByRole('button', { name: /^Reservar / }).first()
  const nome = ((await reservar.getAttribute('aria-label')) ?? '').replace(/^Reservar /, '')
  let reservaId = ''
  await test.step('o "Reservar" do cartão abre a folha de reserva na conversa', async () => {
    await reservar.click()
    await expect(page).toHaveURL(/\/capi$/)
    const folha = page.getByRole('dialog', { name: 'Como você quer reservar?' })
    await expect(folha.getByRole('group', { name: 'Tamanho' })).toBeVisible()
    await expect(folha.getByRole('group', { name: 'Cupom' })).toBeVisible()
    await reservarNaFolha(page, '40')
    await expect(page).toHaveURL(/\/reserva\//)
    await expect(page.getByRole('heading', { name: 'Reserva enviada' })).toBeVisible()
    reservaId = decodeURIComponent(new URL(page.url()).pathname.split('/').pop() ?? '')
    const agora = await reservasEmAberto(page, token)
    expect(agora).toHaveLength(antes.length + 1)
    expect(agora).toContain(reservaId)
  })

  await test.step('o mesmo item de novo: "Você já tem uma reserva deste produto", com o link para ela', async () => {
    await page.goto('/capi')
    await conversa.getByRole('button', { name: `Reservar ${nome}` }).first().click()
    const folha = await reservarNaFolha(page, '40')
    const aviso = folha.getByRole('alert')
    await expect(aviso).toContainText('Você já tem uma reserva deste produto.')
    await aviso.getByRole('link', { name: 'Ver a reserva' }).click()
    await expect(page).toHaveURL(`/reserva/${encodeURIComponent(reservaId)}`)
    expect((await reservasEmAberto(page, token)).filter((id) => id === reservaId)).toHaveLength(1)
  })

  // A reserva sai no fim: o outro projeto reserva o mesmo item.
  expect((await page.request.patch(`/api/reservas/${reservaId}/cancelar`, { headers: comToken(token) })).status()).toBe(200)
})
