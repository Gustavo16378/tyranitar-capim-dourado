/** Níveis de fidelidade, do mais baixo ao mais alto. */
export type Nivel = 'semente' | 'broto' | 'capim' | 'dourado'

export const ORDEM_NIVEIS: readonly Nivel[] = ['semente', 'broto', 'capim', 'dourado']

export const NIVEIS: Record<Nivel, string> = {
  semente: 'Semente',
  broto: 'Broto',
  capim: 'Capim',
  dourado: 'Dourado',
}
