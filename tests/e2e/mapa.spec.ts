// O mapa sem "Você está aqui" inventado (docs/evidencias-testes.md, TE20): na primeira rota ele
// pergunta por qual entrada o cliente chegou, lembra a resposta e aceita ?origem=<entrada> (o QR
// de cada entrada). Sem resposta, a rota sai da entrada mais próxima.
import { expect, test } from '@playwright/test'
import { comSessaoDaAna, dados } from './apoio'

const LOJA_A = dados.mapaDaLojaA

test.beforeEach(async ({ page }) => {
  await comSessaoDaAna(page)
})

test('TE20: o mapa pergunta a entrada, lembra a escolha e aceita ?origem= do QR', async ({ page, browser }) => {
  await page.goto(`/mapa?loja=${LOJA_A}`)
  const pergunta = page.getByRole('region', { name: 'Por qual entrada você chegou?' })
  await expect(pergunta).toBeVisible()
  for (const nome of ['Entrada A', 'Entrada B', 'Entrada C', 'Não sei']) {
    await expect(pergunta.getByRole('button', { name: nome })).toBeVisible()
  }
  // Sem resposta: a rota sai da entrada mais próxima e ninguém vira "Você está aqui".
  await expect(page.getByText('Saindo da entrada mais próxima.')).toBeVisible()
  await expect(page.getByRole('img', { name: /com a rota da entrada mais próxima até Loja A/ })).toBeVisible()
  await expect(page.getByText('Você está aqui', { exact: true })).toHaveCount(0)
  // O nome da loja de destino aparece uma vez sobre o mapa (a etiqueta; o nome deitado sai).
  await expect(page.locator('[aria-hidden="true"] span', { hasText: /^Loja A$/ })).toHaveCount(1)

  await pergunta.getByRole('button', { name: 'Entrada B' }).click()
  await expect(pergunta).toHaveCount(0)
  await expect(page.getByText('Saindo da Entrada B.')).toBeVisible()
  await expect(page.getByRole('img', { name: /com a rota da Entrada B até Loja A/ })).toBeVisible()
  await expect(page.getByText('Você está aqui', { exact: true })).toHaveCount(1)

  // A escolha fica lembrada: recarregando, o mapa não pergunta de novo.
  await page.reload()
  await expect(page.getByText('Saindo da Entrada B.')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Por qual entrada você chegou?' })).toHaveCount(0)

  // "Trocar a entrada" pergunta de novo; "Não sei" fica na mais próxima, sem perguntar outra vez.
  await page.getByRole('button', { name: 'Trocar a entrada' }).click()
  await page.getByRole('region', { name: 'Por qual entrada você chegou?' }).getByRole('button', { name: 'Não sei' }).click()
  await expect(page.getByText('Saindo da entrada mais próxima.')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Por qual entrada você chegou?' })).toHaveCount(0)

  // O QR de uma entrada (outro celular, sem nada lembrado) abre o mapa já saindo dela.
  const outro = await browser.newContext()
  const qr = await outro.newPage()
  await comSessaoDaAna(qr)
  await qr.goto(`/mapa?origem=p1-c1&loja=${LOJA_A}`)
  await expect(qr.getByText('Saindo da Entrada C.')).toBeVisible()
  await expect(qr.getByRole('region', { name: 'Por qual entrada você chegou?' })).toHaveCount(0)
  // Só com a entrada, sem loja: o mapa mostra onde a pessoa está.
  await qr.goto('/mapa?origem=p1-c34')
  await expect(qr.getByText(/Você está na Entrada A\./)).toBeVisible()
  await outro.close()
})
