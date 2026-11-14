import { CapiMark } from './CapiMark'
import { cx } from './cx'
import { Icon } from './Icon'
import type { IconName } from './icones'

export type AbaId = 'inicio' | 'busca' | 'salvos' | 'capi' | 'mapa' | 'carteira'

export interface BottomNavProps {
  ativo: AbaId
  /** Chamado com a aba tocada. */
  onSelect?: (aba: AbaId) => void
  /** Quais abas mostrar, na ordem padrão. Padrão: todas as do design system. */
  abas?: AbaId[]
  /** Quantos avisos novos cada aba tem (a Carteira, com as mudanças das reservas): vira um selo. */
  selos?: Partial<Record<AbaId, number>>
}

const ABAS: { id: AbaId; rotulo: string; icone?: IconName }[] = [
  { id: 'inicio', rotulo: 'Início', icone: 'casa' },
  { id: 'busca', rotulo: 'Buscar', icone: 'busca' },
  { id: 'salvos', rotulo: 'Salvos', icone: 'coracao' },
  { id: 'capi', rotulo: 'Capi' },
  { id: 'mapa', rotulo: 'Mapa', icone: 'mapa' },
  { id: 'carteira', rotulo: 'Carteira', icone: 'carteira' },
]

/** Ocupa a largura do pai (no design system, 360 px). */
export function BottomNav({ ativo, onSelect, abas, selos }: BottomNavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="flex w-full justify-around rounded-t-lg border-t border-line bg-surface-raised px-2 pb-3 pt-2 shadow-sheet"
    >
      {ABAS.filter((aba) => !abas || abas.includes(aba.id)).map((aba) => {
        const atual = aba.id === ativo
        const selo = selos?.[aba.id] ?? 0
        return (
          <button
            key={aba.id}
            type="button"
            aria-current={atual ? 'page' : undefined}
            onClick={() => onSelect?.(aba.id)}
            className={cx(
              'flex min-w-14 cursor-pointer flex-col items-center gap-0.5 rounded-sm border-0 bg-transparent px-2.5 py-1.5 text-caption',
              atual ? 'font-semibold text-ink' : 'text-ink-muted',
            )}
          >
            <span
              className={cx(
                'relative grid h-7 w-12 place-items-center rounded-pill',
                atual ? 'bg-marrom-soft text-marrom-ink' : aba.id === 'capi' && 'bg-terra text-on-terra',
              )}
            >
              {aba.icone ? <Icon name={aba.icone} /> : <CapiMark className="size-[22px]" />}
              {selo > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-0.5 -top-1 grid h-4 min-w-4 place-items-center rounded-pill bg-marrom px-1 text-caption font-semibold leading-none text-on-marrom"
                >
                  {selo > 9 ? '9+' : selo}
                </span>
              )}
            </span>
            {aba.rotulo}
            {selo > 0 && <span className="sr-only">{`, ${selo} ${selo === 1 ? 'aviso novo' : 'avisos novos'}`}</span>}
          </button>
        )
      })}
    </nav>
  )
}
