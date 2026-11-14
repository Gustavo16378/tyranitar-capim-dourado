// O roteiro do apagão (Apagao.tsx), separado da animação para ser testado: a tela treme, as
// rachaduras se desenham e as luzes piscam até apagar. Regras (docs/easter-egg.md):
// - no máximo 3 piscadas por segundo (WCAG 2.3.1): uma piscada é um par de mudanças opostas de
//   claridade, então nunca mais de 6 mudanças dentro de um segundo qualquer;
// - com prefers-reduced-motion, nada treme nem pisca: a tela só escurece.

/** Opacidade da camada escura: acima disto conta como luz apagada; abaixo, acesa. */
export const LIMIAR_ESCURO = 0.5

export interface Passo {
  /** Segundos desde o começo do apagão. */
  em: number
  /** Opacidade da camada escura ao fim do passo (0 = luz acesa, 1 = apagada). */
  opacidade: number
  /** Segundos que o passo leva para chegar à opacidade. */
  duracao: number
}

export interface PlanoDoApagao {
  /** Segundos de tremor da tela, a partir do começo (0: sem tremor). */
  tremor: number
  /** Quando as rachaduras começam a se desenhar (null: sem rachaduras). */
  rachaduras: number | null
  /** As luzes: a opacidade da camada escura, passo a passo. O último deixa tudo apagado. */
  luzes: Passo[]
  /** Quando o apagão termina, com tudo escuro. */
  fim: number
}

/** Uma piscada a cada meio segundo: duas por segundo, abaixo do limite de três. */
const PISCADAS: Passo[] = [
  { em: 1.0, opacidade: 0.9, duracao: 0.06 },
  { em: 1.14, opacidade: 0.2, duracao: 0.06 },
  { em: 1.5, opacidade: 0.92, duracao: 0.06 },
  { em: 1.64, opacidade: 0.3, duracao: 0.06 },
  { em: 2.0, opacidade: 0.95, duracao: 0.06 },
  { em: 2.14, opacidade: 0.4, duracao: 0.06 },
  { em: 2.5, opacidade: 1, duracao: 0.5 },
]

export function planoDoApagao(reduzido: boolean): PlanoDoApagao {
  if (reduzido) {
    return { tremor: 0, rachaduras: null, luzes: [{ em: 0, opacidade: 1, duracao: 0.72 }], fim: 0.9 }
  }
  return { tremor: 0.6, rachaduras: 0.25, luzes: PISCADAS, fim: 3.2 }
}

/** Os instantes em que a claridade muda de lado (de acesa para apagada ou o contrário). */
export function mudancasDeClaridade(luzes: Passo[]) {
  const instantes: number[] = []
  let escuro = false
  for (const passo of luzes) {
    const agora = passo.opacidade > LIMIAR_ESCURO
    if (agora !== escuro) instantes.push(passo.em)
    escuro = agora
  }
  return instantes
}

/** O maior número de piscadas (pares de mudanças) dentro de um segundo qualquer. */
export function piscadasNoPiorSegundo(luzes: Passo[]) {
  const mudancas = mudancasDeClaridade(luzes)
  let pior = 0
  for (const inicio of mudancas) {
    const dentro = mudancas.filter((t) => t >= inicio && t < inicio + 1).length
    pior = Math.max(pior, Math.floor(dentro / 2))
  }
  return pior
}
