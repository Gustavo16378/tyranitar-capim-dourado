// Contas do carrossel de cupons do Início (useCarrossel): para onde as setas levam a faixa e
// quanto a roda do mouse anda para o lado. Funções puras, testadas em tests/unidade.

/** Quantos px o mouse anda com o botão apertado antes de virar arraste (abaixo disso, é clique). */
export const LIMIAR_DO_ARRASTE = 5

/** Um cartão da faixa: onde começa (a partir do começo do conteúdo) e a largura, em px. */
export interface Cartao {
  inicio: number
  largura: number
}

/**
 * Para onde a faixa rola com uma seta, sempre parando no começo de um cartão:
 * - próximo (1): o primeiro cartão cortado à direita passa a ser o primeiro da faixa;
 * - anterior (-1): volta uma faixa inteira, e o cartão cortado à esquerda vira o último visível.
 * `posicao` é o scrollLeft, `visivel` a largura onde os cartões aparecem e `maximo` o maior
 * scrollLeft possível.
 */
export function alvoDaSeta(cartoes: Cartao[], posicao: number, visivel: number, maximo: number, sentido: 1 | -1) {
  const limitar = (valor: number) => Math.min(Math.max(valor, 0), Math.max(maximo, 0))
  if (cartoes.length === 0) return limitar(posicao + sentido * visivel)
  // 1 px de folga: o navegador arredonda o scrollLeft.
  if (sentido === 1) {
    const cortado = cartoes.find((c) => c.inicio + c.largura > posicao + visivel + 1)
    if (!cortado) return limitar(maximo)
    // Cartão mais largo que a faixa: anda uma faixa inteira.
    return limitar(cortado.inicio > posicao + 1 ? cortado.inicio : posicao + visivel)
  }
  const primeiroInteiro = cartoes.findIndex((c) => c.inicio >= posicao - 1)
  if (primeiroInteiro === 0) return 0
  const anterior = cartoes[(primeiroInteiro === -1 ? cartoes.length : primeiroInteiro) - 1]
  // O fim do cartão de antes vai para a borda direita; a faixa para no começo de um cartão.
  const fim = anterior.inicio + anterior.largura - visivel
  const parada = cartoes.find((c) => c.inicio >= fim - 1)
  return limitar(Math.min(parada?.inicio ?? 0, posicao - 1))
}

/** Os campos do WheelEvent que importam aqui. */
export interface Roda {
  deltaX: number
  deltaY: number
  /** 0: px; 1: linhas; 2: páginas. */
  deltaMode: number
}

/** Uma linha da roda em px (o Firefox manda em linhas). */
const PX_POR_LINHA = 16

/**
 * Quanto a roda do mouse leva a faixa para o lado, em px (negativo: para a esquerda). Gesto que
 * já é para o lado (touchpad, Shift + roda) fica com o navegador: devolve 0.
 */
export function rodaParaOLado({ deltaX, deltaY, deltaMode }: Roda, larguraDaPagina: number) {
  if (Math.abs(deltaX) >= Math.abs(deltaY)) return 0
  const escala = deltaMode === 1 ? PX_POR_LINHA : deltaMode === 2 ? larguraDaPagina : 1
  return deltaY * escala
}

/**
 * Se a faixa ainda anda nesse sentido. Na ponta, a roda volta a rolar a página: o carrossel não
 * prende quem só quer descer a tela.
 */
export function aindaRola(delta: number, posicao: number, maximo: number) {
  if (delta < 0) return posicao > 1
  if (delta > 0) return posicao < maximo - 1
  return false
}
