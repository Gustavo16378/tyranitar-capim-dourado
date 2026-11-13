import type { ComponentProps } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'
import type { IconName } from './icones'

export interface ButtonProps extends ComponentProps<'button'> {
  /** primary (marrom) é a ação principal: no máximo um por tela. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'confirm' | 'danger' | 'ouro'
  size?: 'sm' | 'lg'
  icon?: IconName
  block?: boolean
}

const VARIANTES = {
  primary: 'border-transparent bg-marrom text-on-marrom',
  ouro: 'border-transparent bg-ouro text-on-ouro',
  secondary: 'border-line-strong bg-surface-raised text-ink',
  ghost: 'border-transparent bg-transparent text-marrom-ink',
  confirm: 'border-transparent bg-cerrado text-on-cerrado',
  danger: 'border-perigo bg-transparent text-perigo-ink',
} as const

const TAMANHOS = {
  padrao: 'h-11 px-5 text-label',
  sm: 'h-9 px-4 text-label',
  lg: 'h-[52px] px-6 text-body font-semibold',
} as const

export function Button({
  variant = 'secondary',
  size,
  icon,
  block,
  className,
  children,
  type = 'button',
  ...resto
}: ButtonProps) {
  return (
    <button
      type={type}
      {...resto}
      className={cx(
        'cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-pill border',
        'transition-[transform,background-color] duration-instante ease-saida active:scale-[.98] motion-reduce:transition-none',
        'disabled:cursor-not-allowed disabled:opacity-[.45]',
        block ? 'flex w-full' : 'inline-flex',
        VARIANTES[variant],
        TAMANHOS[size ?? 'padrao'],
        className,
      )}
    >
      {icon && <Icon name={icon} />}
      {children}
    </button>
  )
}
