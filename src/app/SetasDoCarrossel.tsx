import { Icon } from '../componentes'
import { cx } from '../componentes/cx'
import type { Carrossel } from './useCarrossel'

// Só em tela com mouse (hover e ponteiro fino): no toque, o dedo desliza a faixa.
const SO_COM_MOUSE = 'hidden [@media(hover:hover)_and_(pointer:fine)]:flex'

const SETA =
  'grid size-9 cursor-pointer place-items-center rounded-full border border-line-strong bg-surface-raised text-ink ' +
  'transition-opacity duration-instante hover:border-marrom-ink disabled:cursor-not-allowed disabled:opacity-[.45] ' +
  'motion-reduce:transition-none'

/**
 * As setas de anterior e próximo de um carrossel (useCarrossel). Somem quando tudo cabe na
 * faixa; na ponta, a seta daquele lado fica desligada.
 */
export function SetasDoCarrossel({ carrossel, anterior, proximo }: { carrossel: Carrossel; anterior: string; proximo: string }) {
  const { pontas, andar } = carrossel
  if (pontas.inicio && pontas.fim) return null
  return (
    <div className={cx(SO_COM_MOUSE, 'items-center gap-2')}>
      <button type="button" aria-label={anterior} disabled={pontas.inicio} onClick={() => andar(-1)} className={SETA}>
        <Icon name="seta" className="size-4 -rotate-[135deg]" />
      </button>
      <button type="button" aria-label={proximo} disabled={pontas.fim} onClick={() => andar(1)} className={SETA}>
        <Icon name="seta" className="size-4 rotate-45" />
      </button>
    </div>
  )
}
