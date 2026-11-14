// O cliente cancela a própria reserva (TE28): na carteira e na tela da reserva, sempre com
// confirmação. A paga por Pix pede o estorno; a loja vê as duas canceladas na tela Reservas.
import { expect, test } from '@playwright/test'
import { aba, comToken, entrarNoPainelDaLoja, tokenNaTela } from './apoio'

// Celular e computador usam o mesmo banco: cada um reserva um produto, para não se contarem. As
// duas reservas do mesmo produto vão em tamanhos diferentes: a mesma reserva em aberto duas vezes é 409.
const PRODUTOS: Record<string, { id: string; nome: string; tamanhos: { PIX: string; NA_LOJA: string } }> = {
  'e2e-celular': { id: 'p-sandalia', nome: 'Sandália de couro', tamanhos: { PIX: '36', NA_LOJA: '37' } },
  'e2e-computador': { id: 'p-jaqueta', nome: 'Jaqueta corta-vento', tamanhos: { PIX: 'P', NA_LOJA: 'M' } },
}

test('TE28: o cliente cancela a reserva na carteira e na tela da reserva, e a loja vê cancelada', async ({
  page,
  request,
}, info) => {
  const produto = PRODUTOS[info.project.name]
  await page.goto('/entrar')
  await page.getByRole('button', { name: 'Cliente (Ana)' }).click()
  await expect(page).toHaveURL(/\/inicio$/)
  const ana = comToken(await tokenNaTela(page))

  async function reservar(formaPagamento: 'PIX' | 'NA_LOJA') {
    const resposta = await request.post('/api/reservas', {
      headers: ana,
      data: { produtoId: produto.id, formaPagamento, tamanho: produto.tamanhos[formaPagamento] },
    })
    expect(resposta.status()).toBe(201)
    return ((await resposta.json()) as { id: string }).id
  }
  const paga = await reservar('PIX')
  expect((await request.post(`/api/reservas/${paga}/pagamento`, { headers: ana })).status()).toBe(200)
  const naLoja = await reservar('NA_LOJA')

  await test.step('na carteira: "não" mantém a reserva; "sim" cancela e pede o estorno do Pix', async () => {
    await aba(page, 'Carteira').click()
    const cartao = page.getByRole('listitem').filter({ has: page.locator(`a[href="/reserva/${paga}"]`) })
    const cancelar = cartao.getByRole('button', { name: `Cancelar reserva de ${produto.nome}` })
    const folha = page.getByRole('dialog', { name: 'Cancelar reserva' })

    await cancelar.click()
    await expect(folha.getByText('O produto volta para a loja. Quer cancelar?')).toBeVisible()
    await expect(folha.getByText(/Você já pagou com Pix: o estorno é pedido na hora/)).toBeVisible()
    await folha.getByRole('button', { name: 'Não, manter a reserva' }).click()
    await expect(folha).toBeHidden()
    await expect(cartao).toBeVisible()

    await cancelar.click()
    await folha.getByRole('button', { name: 'Sim, cancelar' }).click()
    await expect(page.getByRole('status').filter({ hasText: `Reserva de ${produto.nome} cancelada.` })).toContainText(
      'O produto voltou para a loja. O estorno do Pix foi pedido.',
    )
    await expect(cartao).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Minhas reservas' })).toBeFocused()
    const lida = await request.get(`/api/reservas/${paga}`, { headers: ana })
    expect(await lida.json()).toMatchObject({ status: 'CANCELADA', pago: true, estornoSolicitado: true })
  })

  await test.step('na tela da reserva: cancelar mostra a reserva cancelada; pagar na loja não tem estorno', async () => {
    await page.goto(`/reserva/${naLoja}`)
    await expect(page.getByRole('heading', { name: 'Reserva enviada' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar reserva', exact: true }).click()
    const folha = page.getByRole('dialog', { name: 'Cancelar reserva' })
    await expect(folha.getByText('O produto volta para a loja. Quer cancelar?')).toBeVisible()
    await expect(folha.getByText(/estorno/)).toHaveCount(0)
    await folha.getByRole('button', { name: 'Sim, cancelar' }).click()
    await expect(page.getByRole('heading', { name: 'Reserva cancelada' })).toBeFocused()
    await expect(page.getByText(`${produto.nome} voltou para o estoque da loja.`)).toBeVisible()
    await expect(page.getByText(/estorno/)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Cancelar reserva', exact: true })).toHaveCount(0)
  })

  await test.step('a loja vê as duas canceladas em Reservas › Encerradas, a do Pix com o estorno', async () => {
    await page.evaluate(() => localStorage.removeItem('sessao'))
    await entrarNoPainelDaLoja(page, '/loja/reservas')
    await page.getByRole('button', { name: 'Encerradas' }).click()
    const canceladas = page.getByRole('article').filter({ hasText: produto.nome }).filter({ hasText: 'Cancelada' })
    await expect(canceladas.filter({ hasText: 'Estorno do Pix solicitado' }).first()).toBeVisible()
    await expect(canceladas.filter({ hasNotText: 'Estorno do Pix solicitado' }).first()).toBeVisible()
  })
})
