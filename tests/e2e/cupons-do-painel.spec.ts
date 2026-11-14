// Editar, desativar, reativar e excluir cupons nos painéis (TE37): o cupom da loja e o voucher do
// shopping, com o formulário da criação e a confirmação do desconto acima de 50%. Cada execução
// cria os próprios cupons, no nível Dourado: a Ana (Capim) não vê nenhum deles, nem se o teste
// parar no meio. O cupom usado do banco de teste (10% em calçados) só é aberto, sem salvar.
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { dados } from './apoio'

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

/** O cartão do cupom: o item da lista que tem o botão de editar dele. */
const cartao = (page: Page, titulo: string) =>
  page.getByRole('listitem').filter({ has: page.getByRole('button', { name: `Editar ${titulo}`, exact: true }) })

test('TE37: a loja cria com confirmação acima de 50%, edita, desativa, reativa e exclui um cupom', async ({ page, request }, info) => {
  await comSessoesDosPaineis(page, request)
  const titulo = `TE37 ${info.project.name}`
  const editado = `${titulo} editado`
  const status = page.getByRole('status').filter({ hasText: /^Cupom/ })

  await test.step('criar com 60% pede confirmação; revisar volta ao formulário', async () => {
    await page.goto('/loja/cupons')
    await page.getByRole('button', { name: 'Novo cupom' }).click()
    await page.getByLabel('Título').fill(titulo)
    await page.getByLabel('Desconto em %').fill('60')
    await page.getByLabel('Nível mínimo').selectOption({ label: 'Dourado' })
    await page.getByRole('button', { name: 'Criar cupom' }).click()
    const pergunta = page.getByRole('group', { name: 'Este cupom dá 60% de desconto. Confirmar?' })
    await expect(pergunta).toBeVisible()
    await expect(pergunta.getByRole('button', { name: 'Confirmar' })).toBeFocused()
    await pergunta.getByRole('button', { name: 'Revisar o desconto' }).click()
    await expect(pergunta).toBeHidden()

    // Mudar o desconto pergunta de novo, com o número novo.
    await page.getByLabel('Desconto em %').fill('55')
    await page.getByRole('button', { name: 'Criar cupom' }).click()
    await page.getByRole('group', { name: 'Este cupom dá 55% de desconto. Confirmar?' }).getByRole('button', { name: 'Confirmar' }).click()
    await expect(status).toHaveText(`Cupom criado: ${titulo}. Ele já aparece para os clientes no atendimento.`)
    await expect(cartao(page, titulo)).toContainText('55%')
  })

  await test.step('editar abre o formulário com o cupom; o nunca usado muda tudo', async () => {
    await page.getByRole('button', { name: `Editar ${titulo}`, exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Editar cupom' })).toBeVisible()
    await expect(page.getByLabel('Título')).toHaveValue(titulo)
    await expect(page.getByLabel('Desconto em %')).toHaveValue('55')
    await expect(page.getByLabel('Desconto em %')).toBeEnabled()
    await page.getByLabel('Título').fill(editado)
    // O desconto não mudou: salva sem perguntar de novo.
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(status).toHaveText(`Cupom salvo: ${editado}.`)
  })

  await test.step('desativar apaga o cupom com o selo "Desativado"; reativar devolve', async () => {
    await page.getByRole('button', { name: `Desativar ${editado}` }).click()
    await expect(status).toContainText(`Cupom desativado: ${editado}.`)
    const reativar = page.getByRole('button', { name: `Reativar ${editado}` })
    await expect(reativar).toBeFocused()
    await expect(cartao(page, editado)).toContainText('Desativado')
    await reativar.click()
    await expect(status).toContainText(`Cupom reativado: ${editado}.`)
    await expect(cartao(page, editado)).not.toContainText('Desativado')
  })

  await test.step('excluir o nunca usado pede confirmação e tira o cartão', async () => {
    await page.getByRole('button', { name: `Excluir ${editado}` }).click()
    const confirmar = page.getByRole('group', { name: `Excluir o cupom “${editado}”? Não dá para desfazer.` })
    await expect(confirmar.getByRole('button', { name: 'Sim, excluir' })).toBeFocused()
    await confirmar.getByRole('button', { name: 'Sim, excluir' }).click()
    await expect(status).toHaveText(`Cupom excluído: ${editado}.`)
    await expect(status).toBeFocused()
    await expect(page.getByRole('button', { name: `Editar ${editado}`, exact: true })).toHaveCount(0)
  })

  await test.step('o cupom já usado não tem Excluir, e o formulário trava o desconto', async () => {
    await expect(page.getByRole('button', { name: 'Editar 10% em calçados', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Excluir 10% em calçados' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Editar 10% em calçados', exact: true }).click()
    await expect(page.getByText(/Este cupom já foi usado ou está numa reserva/)).toBeVisible()
    await expect(page.getByLabel('Desconto em %')).toBeDisabled()
    await expect(page.getByLabel('Título')).toBeEnabled()
    await page.getByRole('button', { name: 'Voltar aos cupons' }).click()
    await expect(page.getByRole('button', { name: 'Novo cupom' })).toBeVisible()
  })
})

test('TE37: o shopping edita, desativa e exclui um voucher', async ({ page, request }, info) => {
  await comSessoesDosPaineis(page, request)
  const titulo = `TE37 voucher ${info.project.name}`
  const status = page.getByRole('status').filter({ hasText: /^Voucher/ })

  await page.goto('/shopping/fidelidade')
  await page.getByRole('button', { name: 'Vouchers e campanhas' }).click()
  await page.getByRole('button', { name: 'Novo voucher' }).click()
  await page.getByLabel('Título').fill(titulo)
  await page.getByText('Valor em reais').click()
  await page.getByLabel('Desconto em reais').fill('5,00')
  await page.getByLabel('Nível mínimo').selectOption({ label: 'Dourado' })
  await page.getByRole('button', { name: 'Criar voucher' }).click()
  await expect(page.getByRole('button', { name: `Editar ${titulo}`, exact: true })).toBeVisible()

  // Nunca usado: o valor muda (em reais, sem a pergunta da porcentagem).
  await page.getByRole('button', { name: `Editar ${titulo}`, exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Editar voucher' })).toBeVisible()
  await expect(page.getByLabel('Desconto em reais')).toHaveValue('5,00')
  await page.getByLabel('Desconto em reais').fill('6,00')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(cartao(page, titulo)).toContainText('R$ 6')

  await page.getByRole('button', { name: `Desativar ${titulo}` }).click()
  await expect(status).toContainText(`Voucher desativado: ${titulo}.`)
  await expect(cartao(page, titulo)).toContainText('Desativado')

  await page.getByRole('button', { name: `Excluir ${titulo}` }).click()
  await page.getByRole('button', { name: 'Sim, excluir' }).click()
  await expect(status).toHaveText(`Voucher excluído: ${titulo}.`)
  await expect(page.getByRole('button', { name: `Editar ${titulo}`, exact: true })).toHaveCount(0)

  // O voucher do banco de teste, já usado: sem Excluir.
  await expect(page.getByRole('button', { name: 'Excluir R$ 20 em qualquer loja' })).toHaveCount(0)
})
