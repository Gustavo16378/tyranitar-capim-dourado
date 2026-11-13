// Contas do carrossel de cupons do Início (src/app/carrossel.ts): setas, roda do mouse e pontas.
import { describe, expect, it } from 'vitest'
import { aindaRola, alvoDaSeta, rodaParaOLado } from '../../src/app/carrossel'

// Quatro cupons de 300 px com 12 px entre eles: começam em 0, 312, 624 e 936; a faixa tem 1236 px.
const CUPONS = [0, 312, 624, 936].map((inicio) => ({ inicio, largura: 300 }))

describe('alvoDaSeta', () => {
  it('próximo: o primeiro cupom cortado à direita vira o primeiro da faixa', () => {
    // Cabe um cupom e um pedaço (400 px): o segundo está cortado.
    const maximo = 1236 - 400
    expect(alvoDaSeta(CUPONS, 0, 400, maximo, 1)).toBe(312)
    expect(alvoDaSeta(CUPONS, 312, 400, maximo, 1)).toBe(624)
    // No meio de um cupom, para no começo do próximo cortado, não no meio.
    expect(alvoDaSeta(CUPONS, 100, 400, maximo, 1)).toBe(312)
  })

  it('próximo perto do fim: para no fim da faixa', () => {
    // Cabem dois cupons e meio (700 px): o terceiro começa depois do fim possível (536).
    expect(alvoDaSeta(CUPONS, 0, 700, 536, 1)).toBe(536)
    expect(alvoDaSeta(CUPONS, 536, 700, 536, 1)).toBe(536)
  })

  it('anterior: volta uma faixa e o cupom cortado à esquerda vira o último visível', () => {
    const maximo = 1236 - 400
    expect(alvoDaSeta(CUPONS, 624, 400, maximo, -1)).toBe(312)
    expect(alvoDaSeta(CUPONS, 312, 400, maximo, -1)).toBe(0)
    // Do fim da faixa larga, volta ao começo de uma vez.
    expect(alvoDaSeta(CUPONS, 536, 700, 536, -1)).toBe(0)
  })

  it('anterior no começo fica no começo; sempre dentro dos limites', () => {
    expect(alvoDaSeta(CUPONS, 0, 400, 836, -1)).toBe(0)
    expect(alvoDaSeta(CUPONS, 836, 400, 836, 1)).toBe(836)
    expect(alvoDaSeta([], 100, 400, 836, 1)).toBe(500)
    expect(alvoDaSeta([], 100, 400, 836, -1)).toBe(0)
  })

  it('cupom mais largo que a faixa: anda uma faixa inteira', () => {
    const largos = [0, 520].map((inicio) => ({ inicio, largura: 500 }))
    expect(alvoDaSeta(largos, 0, 300, 720, 1)).toBe(300)
  })
})

describe('rodaParaOLado', () => {
  it('a roda para baixo anda para a direita; para cima, para a esquerda', () => {
    expect(rodaParaOLado({ deltaX: 0, deltaY: 120, deltaMode: 0 }, 900)).toBe(120)
    expect(rodaParaOLado({ deltaX: 0, deltaY: -120, deltaMode: 0 }, 900)).toBe(-120)
  })

  it('converte linhas e páginas em px', () => {
    expect(rodaParaOLado({ deltaX: 0, deltaY: 3, deltaMode: 1 }, 900)).toBe(48)
    expect(rodaParaOLado({ deltaX: 0, deltaY: 1, deltaMode: 2 }, 900)).toBe(900)
  })

  it('gesto que já é para o lado (touchpad, Shift + roda) fica com o navegador', () => {
    expect(rodaParaOLado({ deltaX: 80, deltaY: 10, deltaMode: 0 }, 900)).toBe(0)
    expect(rodaParaOLado({ deltaX: 0, deltaY: 0, deltaMode: 0 }, 900)).toBe(0)
  })
})

describe('aindaRola', () => {
  it('na ponta, a roda volta para a página', () => {
    expect(aindaRola(100, 0, 500)).toBe(true)
    expect(aindaRola(-100, 0, 500)).toBe(false)
    expect(aindaRola(100, 500, 500)).toBe(false)
    expect(aindaRola(-100, 500, 500)).toBe(true)
    expect(aindaRola(0, 200, 500)).toBe(false)
  })

  it('tudo cabe na faixa: nunca prende a roda', () => {
    expect(aindaRola(100, 0, 0)).toBe(false)
    expect(aindaRola(-100, 0, 0)).toBe(false)
  })
})
