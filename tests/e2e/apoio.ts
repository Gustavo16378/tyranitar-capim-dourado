// Passos que as jornadas e os testes de acessibilidade repetem.
import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { dados } from './dados'

export { dados }

/** A pergunta do roteiro da demonstração, que a Capi manda sozinha com VITE_MODO_DEMO=1. */
export const PERGUNTA_DO_ROTEIRO = 'Tem esse tênis aí no shopping? Uso 42.'

export const comToken = (token: string) => ({ Authorization: `Bearer ${token}` })

/** Abre a sessão da Ana direto pela API (POST /api/auth/demo), sem passar pela tela de login. */
export async function comSessaoDaAna(page: Page) {
  const resposta = await page.request.post('/api/auth/demo')
  expect(resposta.status(), 'a conta de demonstração precisa de DEMO=1').toBe(200)
  const sessao = (await resposta.json()) as { token: string }
  await page.addInitScript((valor) => localStorage.setItem('sessao', JSON.stringify(valor)), sessao)
  return sessao
}

/** O token que o app guardou depois do login. */
export async function tokenNaTela(page: Page) {
  const sessao = await page.evaluate(() => JSON.parse(localStorage.getItem('sessao') ?? 'null'))
  expect(sessao?.token, 'o app não guardou a sessão').toBeTruthy()
  return sessao.token as string
}

/** Pontos da Ana agora, pela API (GET /api/me/carteira). */
export async function pontosDaAna(request: APIRequestContext, token: string) {
  const resposta = await request.get('/api/me/carteira', { headers: comToken(token) })
  expect(resposta.status()).toBe(200)
  return ((await resposta.json()) as { pontos: number }).pontos
}

/** Token do lojista da Loja A, pelo login de verdade (POST /api/auth/login). */
export async function tokenDoLojista(request: APIRequestContext) {
  const resposta = await request.post('/api/auth/login', { data: dados.lojista })
  expect(resposta.status()).toBe(200)
  return ((await resposta.json()) as { token: string }).token
}

/** Abre uma tela do painel da loja pelo login único: o painel manda para /entrar e volta. */
export async function entrarNoPainelDaLoja(page: Page, caminho = '/loja/atendimento') {
  await page.goto(caminho)
  await expect(page).toHaveURL(/\/entrar$/)
  await page.getByLabel('E-mail').fill(dados.lojista.email)
  await page.getByLabel('Senha').fill(dados.lojista.senha)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL((url) => url.pathname === caminho)
}

/** Espera a Capi terminar o roteiro da demonstração (o botão de separar aparece no fim). */
export async function esperarRoteiroDaCapi(page: Page) {
  const conversa = page.getByRole('log', { name: 'Conversa com a Capi' })
  await expect(conversa.getByText(PERGUNTA_DO_ROTEIRO)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sim, separar' })).toBeVisible()
  return conversa
}

/** Toca numa aba da navegação do app. */
export function aba(page: Page, nome: 'Início' | 'Capi' | 'Mapa' | 'Carteira') {
  // No celular, a BottomNav (botões); a partir de 768 px, a barra lateral (links). Só uma aparece.
  const navegacao = page.getByRole('navigation', { name: 'Navegação principal' })
  return navegacao.getByRole('button', { name: nome }).or(navegacao.getByRole('link', { name: nome }))
}
