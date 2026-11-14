// A reserva com a loja de ponta a ponta (TE36): a Ana no celular e o painel da loja numa segunda
// janela, como na demonstração. Ela reserva com tamanho e cupom; o painel avisa a reserva nova no
// selo do menu; a loja confirma com a hora, e a Ana vê a hora e o aviso; a loja separa; no
// Atendimento, a reserva sai junto com um produto do catálogo; e os pontos chegam na carteira.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { formatarNumero, formatarPreco } from '../../src/componentes/formatar'
import { aba, comSessaoDaAna, comToken, entrarNoPainelDaLoja, pontosDaAna } from './apoio'

// Celular e computador usam o mesmo banco, e cada cupom vale uma vez: cada um reserva um produto
// com um cupom diferente. O voucher do shopping fica livre para a folha de reservar do TX04.
const ROTEIROS = {
  'e2e-celular': {
    reserva: { id: 'p-run', nome: 'Tênis Run 2 preto', tamanho: '41', precoCentavos: 34990 },
    cupom: { titulo: '10% em calçados', descontoCentavos: 3499 },
    pix: true,
    doCatalogo: { busca: 'camiseta', nome: 'Camiseta dry-fit', precoCentavos: 7990 },
  },
  'e2e-computador': {
    reserva: { id: 'p-camiseta', nome: 'Camiseta dry-fit', tamanho: 'M', precoCentavos: 7990 },
    cupom: { titulo: 'R$ 15 em camisetas', descontoCentavos: 1500 },
    pix: false,
    doCatalogo: { busca: 'sandália', nome: 'Sandália de couro', precoCentavos: 15990 },
  },
} as const

/** O link Reservas do menu lateral, com o selo das novas: "Reservas, 2 reservas novas". */
const menu = (painel: Page) => painel.getByRole('navigation', { name: 'Telas do painel' })
const linkDasReservas = (painel: Page) => menu(painel).getByRole('link', { name: /^Reservas/ })

/** Escolhe uma opção da folha de reservar pelo rótulo, como a pessoa toca (o rádio fica sob o rótulo). */
async function escolher(grupo: Locator, nome: string | RegExp) {
  const opcao = { name: nome, exact: typeof nome === 'string' }
  // O `has` procura dentro de cada rótulo: o localizador do rádio não pode vir preso ao grupo.
  await grupo.locator('label').filter({ has: grupo.page().getByRole('radio', opcao) }).click()
  await expect(grupo.getByRole('radio', opcao)).toBeChecked()
}

/** Quantas novas o selo diz agora (0 sem selo). */
async function novasNoSelo(painel: Page) {
  const nome = (await linkDasReservas(painel).getAttribute('aria-label')) ?? (await linkDasReservas(painel).innerText())
  return Number(/(\d+) reservas? novas?/.exec(nome)?.[1] ?? 0)
}

test('TE36: a Ana reserva com cupom, a loja confirma com a hora, separa e entrega no balcão com um item do catálogo', async ({
  page,
  browser,
  baseURL,
}, info) => {
  // Espera o aviso do painel, que pergunta à API a cada 20 s.
  test.setTimeout(150_000)
  const roteiro = ROTEIROS[info.project.name as keyof typeof ROTEIROS]
  const { token } = await comSessaoDaAna(page)
  const pontosAntes = await pontosDaAna(page.request, token)
  const precoDaReserva = roteiro.reserva.precoCentavos - roteiro.cupom.descontoCentavos

  // O painel da loja numa janela de computador, aberto antes da reserva: o que já estava lá não é novo.
  const janela = await browser.newContext({ baseURL, viewport: { width: 1280, height: 800 } })
  const painel = await janela.newPage()
  // A primeira consulta do aviso (só as pendentes) guarda o que já existe, sem tocar o som.
  const primeiraConsulta = painel.waitForResponse((r) => {
    const url = new URL(r.url())
    return url.pathname === '/api/loja/reservas' && url.searchParams.get('status') === 'PENDENTE'
  })
  await entrarNoPainelDaLoja(painel, '/loja/reservas')
  await expect(painel.getByRole('heading', { level: 1, name: 'Reservas' })).toBeVisible()
  const { pendentes: novasAntes } = (await (await primeiraConsulta).json()) as { pendentes: number }
  await expect.poll(() => novasNoSelo(painel)).toBe(novasAntes)

  let reservaId = ''
  await test.step('a Ana reserva com o tamanho e o cupom; o preço e o Pix saem com o desconto', async () => {
    await page.goto(`/produto/${roteiro.reserva.id}`)
    await page.getByRole('button', { name: 'Reservar' }).click()
    const folha = page.getByRole('dialog', { name: 'Como você quer reservar?' })
    await escolher(folha.getByRole('group', { name: 'Tamanho' }), roteiro.reserva.tamanho)
    await escolher(folha.getByRole('group', { name: 'Cupom' }), new RegExp(`^${roteiro.cupom.titulo.replace('$', '\\$')}`))
    await expect(folha.getByText(`Total ${formatarPreco(precoDaReserva)}`)).toBeVisible()
    await folha.getByRole('button', { name: roteiro.pix ? /Pagar agora com Pix/ : /Pagar na loja/ }).click()
    await expect(page).toHaveURL(/\/reserva\//)
    reservaId = decodeURIComponent(new URL(page.url()).pathname.split('/').pop() ?? '')
    if (roteiro.pix) {
      await expect(page.getByText(formatarPreco(precoDaReserva)).first()).toBeVisible()
      await page.getByRole('button', { name: 'Já paguei' }).click()
    }
    await expect(page.getByRole('heading', { name: 'Reserva enviada' })).toBeVisible()
  })

  const cartao = painel
    .getByRole('article', { name: roteiro.reserva.nome })
    .filter({ hasText: `Ana · tamanho ${roteiro.reserva.tamanho}` })
    .filter({ hasText: roteiro.cupom.titulo })
  await test.step('o painel avisa a reserva nova no selo do menu e no leitor de tela, sem recarregar', async () => {
    await expect.poll(() => novasNoSelo(painel), { timeout: 30_000 }).toBe(novasAntes + 1)
    await expect(painel.getByRole('status').filter({ hasText: `Reserva nova: ${roteiro.reserva.nome} para Ana.` })).toBeAttached()
    await painel.getByRole('button', { name: /^Novas/ }).click()
    await expect(cartao).toHaveCount(1)
    await expect(cartao).toContainText(formatarPreco(precoDaReserva))
    await expect(cartao).toContainText(`era ${formatarPreco(roteiro.reserva.precoCentavos)}`)
    await expect(cartao).toContainText(roteiro.pix ? 'Pago com Pix' : 'Pagar na loja')
  })

  let hora = ''
  await test.step('a loja confirma com a hora em que fica pronta', async () => {
    await cartao.getByRole('button', { name: 'Confirmar', exact: true }).click()
    const campo = painel.getByLabel('Pronta para retirar a partir de')
    await expect(campo).toBeFocused()
    // A hora já vem na próxima meia hora; a frase embaixo diz se é hoje ou amanhã.
    hora = await campo.inputValue()
    expect(hora).toMatch(/^\d\d:[03]0$/)
    await expect(painel.getByText(new RegExp(`^(Hoje|Amanhã), a partir das ${hora}\\.$`))).toBeVisible()
    await painel.getByRole('button', { name: 'Confirmar reserva' }).click()
    await painel.getByRole('button', { name: 'Confirmadas' }).click()
    await expect(cartao).toContainText('Confirmada')
    await expect(cartao).toContainText('Pronta a partir de')
  })

  await test.step('a Ana vê a hora na reserva, o aviso no Início e o selo na Carteira', async () => {
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Reserva confirmada' })).toBeVisible()
    await expect(page.getByText(`Pronta para retirar a partir das ${hora}.`, { exact: false })).toBeVisible()
    await aba(page, 'Início').click()
    const sino = page.getByRole('button', { name: /^Avisos, \d+ novos?$/ })
    await expect(sino).toBeVisible()
    await expect(aba(page, 'Carteira')).toHaveAccessibleName(/\d+ avisos? novos?/)
    await sino.click()
    const avisos = page.getByRole('dialog', { name: 'Avisos' })
    await expect(avisos.getByText('Loja A confirmou sua reserva').first()).toBeVisible()
    await expect(
      avisos.getByText(`Sua reserva de ${roteiro.reserva.nome} fica pronta para retirar a partir das ${hora}.`).first(),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(avisos).toBeHidden()
    await expect(page.getByRole('button', { name: 'Avisos', exact: true })).toBeVisible()
    await aba(page, 'Carteira').click()
    const naCarteira = page.getByRole('listitem').filter({ has: page.locator(`a[href="/reserva/${reservaId}"]`) })
    await expect(naCarteira).toContainText(`Confirmada · pronta às ${hora}`)
    await expect(naCarteira).toContainText(`Tamanho ${roteiro.reserva.tamanho}`)
    await expect(naCarteira).toContainText(`cupom ${roteiro.cupom.titulo}`)
  })

  await test.step('a loja separa, e a Ana vê "Separado para você"', async () => {
    await cartao.getByRole('button', { name: 'Separar' }).click()
    await painel.getByRole('button', { name: 'Separadas' }).click()
    await expect(cartao).toContainText('Separada')
    await page.goto(`/reserva/${reservaId}`)
    await expect(page.getByRole('heading', { name: 'Separado para você' })).toBeVisible()
  })

  const totalCentavos = precoDaReserva + roteiro.doCatalogo.precoCentavos
  const pontos = Math.floor(totalCentavos / 100)
  await test.step('no Atendimento, a reserva sai com um produto do catálogo e a compra é registrada', async () => {
    await menu(painel).getByRole('link', { name: /^Atendimento/ }).click()
    await painel.getByRole('button', { name: 'Simular leitura' }).click()
    await painel.getByRole('button', { name: `Retirar ${roteiro.reserva.nome}` }).click()
    await painel.getByRole('searchbox', { name: 'Buscar no catálogo da loja' }).fill(roteiro.doCatalogo.busca)
    await painel.getByRole('button', { name: `Adicionar ${roteiro.doCatalogo.nome}` }).click()
    const itens = painel.getByRole('list', { name: 'Itens da compra' })
    await expect(itens.getByRole('listitem').filter({ hasText: roteiro.reserva.nome })).toBeVisible()
    await expect(itens.getByRole('listitem').filter({ hasText: roteiro.doCatalogo.nome })).toBeVisible()
    // O cupom da reserva já ocupa o lado da loja: nada mais a escolher nele.
    await painel.getByRole('radio', { name: 'Sem voucher' }).check()
    await expect(painel.getByText(`Ana ganha ${formatarNumero(pontos)} pontos`)).toBeVisible()
    await painel.getByRole('button', { name: 'Registrar compra' }).click()
    const recibo = painel.getByRole('list', { name: 'Itens registrados' })
    await expect(recibo).toContainText(roteiro.reserva.nome)
    await expect(recibo).toContainText(roteiro.doCatalogo.nome)
    await painel.getByRole('button', { name: 'Próximo cliente' }).click()
  })

  await test.step('a carteira da Ana mostra os pontos e a reserva sai de Minhas reservas', async () => {
    await aba(page, 'Carteira').click()
    await expect(page.locator('[data-carteira-pontos]')).toHaveText(formatarNumero(pontosAntes + pontos))
    await expect(page.locator(`a[href="/reserva/${reservaId}"]`)).toHaveCount(0)
    const lida = await page.request.get(`/api/reservas/${reservaId}`, { headers: comToken(token) })
    expect(await lida.json()).toMatchObject({ status: 'RETIRADA' })
  })

  await janela.close()
})
