import { useId, type ComponentProps } from 'react'
import { cx } from '../../componentes/cx'

interface CampoLongoProps extends Omit<ComponentProps<'textarea'>, 'id'> {
  rotulo: string
  dica?: string
  erro?: string | null
}

/** Texto de várias linhas (descrição, lista de endereços), no mesmo formato do Campo. */
export function CampoLongo({ rotulo, dica, erro, className, rows = 3, ...textarea }: CampoLongoProps) {
  const id = useId()
  const ajuda = erro || dica
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-label">
        {rotulo}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={erro ? true : undefined}
        aria-describedby={ajuda ? `${id}-ajuda` : undefined}
        className={cx(
          'resize-y rounded-sm border bg-surface-sunken px-3 py-2 text-body text-ink placeholder:text-ink-muted',
          erro ? 'border-perigo' : 'border-line-strong',
        )}
        {...textarea}
      />
      {ajuda && (
        <p id={`${id}-ajuda`} className={cx('text-body-sm', erro ? 'text-perigo-ink' : 'text-ink-muted')}>
          {ajuda}
        </p>
      )}
    </div>
  )
}
