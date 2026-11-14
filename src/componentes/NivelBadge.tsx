import { CapiTirana } from './CapiTirana'
import { cx } from './cx'
import { NOME_DO_NIVEL, ORDEM_NIVEIS, type Nivel, type NivelDoSelo } from './nivel'

export interface NivelBadgeProps {
  /** Um dos quatro níveis, ou o secreto ('tirano'), que só o easter egg mostra. */
  nivel: NivelDoSelo
}

const CORES = {
  semente: 'bg-nivel-semente text-nivel-semente-ink',
  broto: 'bg-nivel-broto text-nivel-broto-ink',
  capim: 'bg-nivel-capim text-nivel-capim-ink',
  dourado: 'bg-nivel-dourado text-nivel-dourado-ink',
  // O secreto: terra com contorno ouro, para destacar também sobre o cartão terra da carteira.
  tirano: 'bg-terra text-on-terra ring-1 ring-inset ring-ouro',
} as const

const ARCOS = ['M8 8m-2 0a2 2 0 1 0 4 0', 'a4 4 0 1 0-8 0', 'a6 6 0 1 0 12 0', 'a7.5 7.5 0 1 0-15 0']

/** A espiral do selo: quanto mais alto o nível, mais voltas. */
function NivelGlyph({ nivel }: { nivel: Nivel }) {
  const voltas = ORDEM_NIVEIS.indexOf(nivel) + 1
  return (
    <svg
      viewBox="-1 -1 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d={ARCOS.slice(0, voltas).join('')} />
    </svg>
  )
}

export function NivelBadge({ nivel = 'semente' }: NivelBadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill py-1.5 pl-2 pr-3 text-caption font-semibold [&>svg]:size-4',
        CORES[nivel],
      )}
    >
      {nivel === 'tirano' ? <CapiTirana /> : <NivelGlyph nivel={nivel} />}
      Nível {NOME_DO_NIVEL[nivel]}
    </span>
  )
}
