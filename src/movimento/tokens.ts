import tokens from '../design-system/tokens.json'

function segundos(nome: string) {
  const token = tokens.duracao.tokens.find((t) => t.name === `duracao-${nome}`)
  const ms = token?.value.match(/^(\d+)ms$/)
  if (!ms) throw new Error(`Token duracao-${nome} ausente ou fora do formato "123ms"`)
  return Number(ms[1]) / 1000
}

/** Durações dos tokens duracao-*, em segundos (o GSAP usa segundos). */
export const DURACAO = {
  instante: segundos('instante'),
  rapida: segundos('rapida'),
  media: segundos('media'),
  lenta: segundos('lenta'),
  celebracao: segundos('celebracao'),
} as const

/** Equivalente GSAP de cada token ease-* (está escrito na nota de cada token). */
export const EASE = {
  saida: 'expo.out',
  suave: 'power3.inOut',
  mola: 'back.out(1.6)',
  entrada: 'power3.in',
} as const

/** Tudo que entra na tela sobe no máximo isto, em px. */
export const DESLOCAMENTO = 24

/** Intervalo entre um elemento e o próximo na cascata, em segundos. */
export const PASSO_CASCATA = 0.06

export const MOVIMENTO_NORMAL = '(prefers-reduced-motion: no-preference)'
export const MOVIMENTO_REDUZIDO = '(prefers-reduced-motion: reduce)'
