import type { ComponentProps, ReactNode } from 'react'
import { cx } from '../../componentes/cx'

interface OpcaoProps extends Omit<ComponentProps<'input'>, 'type'> {
  tipo: 'checkbox' | 'radio'
  children: ReactNode
}

/** Caixa de marcar ou opção de rádio com o texto ao lado; a linha toda tem 44 px e é clicável. */
export function Opcao({ tipo, children, className, ...input }: OpcaoProps) {
  return (
    <label className={cx('flex min-h-11 cursor-pointer items-center gap-3 text-body-sm', className)}>
      <input type={tipo} className="size-[18px] flex-none cursor-pointer accent-marrom" {...input} />
      <span>{children}</span>
    </label>
  )
}
