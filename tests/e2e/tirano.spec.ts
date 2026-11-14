// Easter eggs do tirano no site de verdade (o build, as Functions e o roteamento do Pages): o
// banner no console ao abrir uma tela, tyranitar() disparando "tyranitar:acordar" no window, os
// créditos escondidos no HTML servido e a API com o X-Tyranitar e a rota /api/loja-13.
import { expect, test } from '@playwright/test'

const DICA = 'digite tyranitar() para acordar o tirano'
const TIRANO = 'ontem foi sexta-feira 13'

test('o banner do tirano no console e tyranitar() disparando o evento', async ({ page }) => {
  const mensagens: string[] = []
  page.on('console', (mensagem) => mensagens.push(mensagem.text()))
  await page.goto('/entrar')
  await expect.poll(() => mensagens.some((texto) => texto.includes(DICA))).toBe(true)
  expect(mensagens.find((texto) => texto.includes(DICA))).toContain('|_   _|')

  const acordou = await page.evaluate(() => {
    let eventos = 0
    window.addEventListener('tyranitar:acordar', () => eventos++)
    const resposta = (window as unknown as { tyranitar: () => string }).tyranitar()
    return { eventos, resposta }
  })
  expect(acordou).toEqual({ eventos: 1, resposta: 'O tirano acordou.' })
})

test('o HTML servido guarda os créditos num comentário', async ({ request }) => {
  const html = await (await request.get('/')).text()
  const comentario = html.match(/<!--([\s\S]*?TYRANITAR[\s\S]*?)-->/)?.[1]
  expect(comentario).toContain('Haroldo Soares')
  expect(comentario).toContain('Paulo Rafael')
})

test('a API no Pages: X-Tyranitar e GET /api/loja-13 com os créditos', async ({ request }) => {
  const saude = await request.get('/api/saude')
  expect(saude.headers()['x-tyranitar']).toBe(TIRANO)

  const creditos = await request.get('/api/loja-13')
  expect(creditos.status()).toBe(200)
  expect(creditos.headers()['x-tyranitar']).toBe(TIRANO)
  expect(await creditos.json()).toMatchObject({ equipe: 'Tyranitar', orientadores: ['Haroldo Soares', 'Paulo Rafael'] })

  // Só o GET existe: outro método cai no 404 da API, também marcado.
  const outroMetodo = await request.post('/api/loja-13')
  expect(outroMetodo.status()).toBe(404)
  expect(outroMetodo.headers()['x-tyranitar']).toBe(TIRANO)
})
