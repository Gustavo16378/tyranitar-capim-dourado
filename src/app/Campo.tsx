import { useId, type ComponentProps } from 'react'

export interface CampoProps extends ComponentProps<'input'> {
  rotulo: string
}

/** Campo de formulário: rótulo em cima e o texto em body (16 px, para o celular não dar zoom). */
export function Campo({ rotulo, ...props }: CampoProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-label">
        {rotulo}
      </label>
      <input
        id={id}
        {...props}
        className="h-11 rounded-sm border border-line-strong bg-surface-raised px-3 text-body text-ink placeholder:text-ink-muted"
      />
    </div>
  )
}
