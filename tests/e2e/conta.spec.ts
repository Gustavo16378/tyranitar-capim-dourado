// Minha conta (docs/telas.md): editar o nome, trocar a senha pedindo a atual, baixar os dados
// (LGPD) e apagar um interesse da ficha que a Capi anotou.
import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { comToken, dados, tokenDoLojista } from './apoio'

/**
 * Guarda a sessão no app antes de abrir a página, como o login faria. Só na primeira página: nas
 * seguintes vale a que o app guardou (com o nome novo, depois de editar).
 */
async function comSessao(page: Page, sessao: unknown) {
  await page.addInitScript((valor) => {
    if (!localStorage.getItem('sessao')) localStorage.setItem('sessao', JSON.stringify(valor))
  }, sessao)
}

test('TE13: Minha conta troca o nome e a senha e baixa os dados', async ({ page, request }) => {
  // Uma conta nova a cada execução: a senha muda, e o teste pode rodar de novo no mesmo banco.
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@teste.test`
  const SENHA = 'senha-inicial-123'
  const cadastro = await request.post('/api/auth/cadastro', { data: { nome: 'Bia Lopes', email, senha: SENHA } })
  expect(cadastro.status()).toBe(201)
  await comSessao(page, await cadastro.json())
  await page.goto('/conta')

  await test.step('editar o nome: a saudação do Início muda junto', async () => {
    await page.getByRole('button', { name: 'Editar nome' }).click()
    await page.getByRole('textbox', { name: 'Nome' }).fill('Beatriz Lopes')
    await page.getByRole('button', { name: 'Salvar nome' }).click()
    await expect(page.getByText('Nome atualizado.')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Seus dados' }).getByText('Beatriz Lopes')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Editar nome' })).toBeFocused()
    await page.goto('/inicio')
    await expect(page.getByText(/, Beatriz$/)).toBeVisible()
    await page.goto('/conta')
  })

  await test.step('trocar a senha: a atual errada é recusada e a sessão continua', async () => {
    await page.getByRole('button', { name: 'Trocar senha' }).click()
    const folha = page.getByRole('dialog', { name: 'Trocar a senha' })
    await folha.getByLabel('Senha atual').fill('nao-e-essa-senha')
    await folha.getByLabel('Senha nova', { exact: true }).fill('senha-nova-456')
    await folha.getByLabel('Repita a senha nova').fill('senha-nova-456')
    await folha.getByRole('button', { name: 'Salvar senha' }).click()
    await expect(folha.getByRole('alert')).toContainText('A senha atual não confere')
    await expect(page).toHaveURL(/\/conta$/)

    await folha.getByLabel('Senha atual').fill(SENHA)
    await folha.getByRole('button', { name: 'Salvar senha' }).click()
    await expect(folha).toBeHidden()
    await expect(page.getByText('Senha trocada.')).toBeVisible()
    const novaEntra = await request.post('/api/auth/login', { data: { email, senha: 'senha-nova-456' } })
    expect(novaEntra.status()).toBe(200)
    const antigaNao = await request.post('/api/auth/login', { data: { email, senha: SENHA } })
    expect(antigaNao.status()).toBe(401)
  })

  await test.step('baixar os dados: um arquivo JSON com a conta', async () => {
    const [arquivo] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Baixar meus dados' }).click(),
    ])
    expect(arquivo.suggestedFilename()).toMatch(/^meus-dados-\d{4}-\d\d-\d\d\.json$/)
    const conteudo = JSON.parse(await readFile((await arquivo.path())!, 'utf8'))
    expect(conteudo.conta).toMatchObject({ nome: 'Beatriz Lopes', email })
    expect(conteudo).toHaveProperty('conversaComACapi')
    await expect(page.getByText(`Pronto: o arquivo ${arquivo.suggestedFilename()} foi baixado.`)).toBeVisible()
  })
})

test('TE14: Minha conta mostra o que a Capi anotou e apaga um interesse', async ({ page, request }) => {
  const entrar = await request.post('/api/auth/login', { data: { email: dados.carla.email, senha: dados.carla.senha } })
  expect(entrar.status()).toBe(200)
  await comSessao(page, await entrar.json())
  await page.goto('/conta')

  const interesses = page.getByRole('list', { name: 'Interesses anotados' }).getByRole('listitem')
  await expect(interesses.first()).toBeVisible()
  const antes = await interesses.count()
  const primeiro = interesses.first()
  // O rótulo da categoria e a frase: "Calçados" e "Tênis de trilha, número 38".
  const detalhe = (await primeiro.locator('span').nth(1).textContent())!
  await primeiro.getByRole('button', { name: `Apagar da ficha: ${detalhe}` }).click()

  await expect(page.getByRole('status').filter({ hasText: `Apagado da ficha: ${detalhe}` })).toBeVisible()
  await expect(interesses).toHaveCount(antes - 1)
  await expect(page.getByText(detalhe, { exact: true })).toHaveCount(0)
  // No balcão, a loja não vê mais esse interesse.
  const lojista = comToken(await tokenDoLojista(request))
  const atendimento = await request.get(`/api/loja/atendimento/${dados.carla.qrToken}`, { headers: lojista })
  expect(atendimento.status()).toBe(200)
  expect(((await atendimento.json()) as { ficha: string[] }).ficha).not.toContain(detalhe)
})
