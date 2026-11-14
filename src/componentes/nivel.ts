/** Níveis de fidelidade, do mais baixo ao mais alto. */
export type Nivel = 'semente' | 'broto' | 'capim' | 'dourado'

export const ORDEM_NIVEIS: readonly Nivel[] = ['semente', 'broto', 'capim', 'dourado']

export const NIVEIS: Record<Nivel, string> = {
  semente: 'Semente',
  broto: 'Broto',
  capim: 'Capim',
  dourado: 'Dourado',
}

/**
 * O nível secreto, acima do Dourado: só o easter egg do tirano libera (docs/easter-egg.md). Não
 * existe na API nem nas regras de pontos; só o selo, na carteira do modo tirano.
 */
export const NIVEL_SECRETO = 'tirano'

/** O que um selo pode mostrar: os quatro níveis e o secreto. */
export type NivelDoSelo = Nivel | typeof NIVEL_SECRETO

export const NOME_DO_NIVEL: Record<NivelDoSelo, string> = { ...NIVEIS, tirano: 'Tirano' }
