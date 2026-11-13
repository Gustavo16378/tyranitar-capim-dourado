import type { ReactNode } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'
import type { IconName } from './icones'

export interface BadgeProps {
  /** Estado nunca só pela cor: o texto do selo diz o que é. */
  tone?: 'neutral' | 'ouro' | 'cerrado' | 'aviso' | 'perigo'
  icon?: IconName
  children?: ReactNode
}

const TONS = {
  neutral: 'bg-surface-sunken text-ink',
  ouro: 'bg-ouro-soft text-ouro-ink',
  cerrado: 'bg-cerrado-soft text-cerrado-ink',
  aviso: 'bg-aviso-soft text-aviso-ink',
  perigo: 'bg-perigo-soft text-perigo-ink',
} as const

export function Badge({ tone = 'neutral', icon, children }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-pill px-2.5 py-1 text-caption [&>svg]:size-3.5',
        TONS[tone],
      )}
    >
      {icon && <Icon name={icon} />}
      {children}
    </span>
  )
}
