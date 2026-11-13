import { useId, type ComponentProps } from 'react'
import { cx } from '../../componentes/cx'

interface CampoProps extends Omit<ComponentProps<'input'>, 'id'> {
  rotulo: string
  /** Texto antes do valor, dentro do campo: "R$". */
  prefixo?: string
  /** Ajuda curta embaixo do campo. */
  dica?: string
  /** Mensagem de erro; deixa o campo marcado como inválido. */
  erro?: string | null
}

/** Campo de texto do painel: rótulo em cima, 16 px, fundo surface-sunken, 44 px de altura. */
export function Campo({ rotulo, prefixo, dica, erro, className, ...input }: CampoProps) {
  const id = useId()
  const idAjuda = `${id}-ajuda`
  const ajuda = erro || dica
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-label">
        {rotulo}
      </label>
      <div
        className={cx(
          'flex h-11 items-center gap-2 rounded-sm border bg-surface-sunken px-3',
          'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring',
          erro ? 'border-perigo' : 'border-line-strong',
        )}
      >
        {prefixo && (
          <span aria-hidden="true" className="text-body text-ink-muted">
            {prefixo}
          </span>
        )}
        <input
          id={id}
          aria-invalid={erro ? true : undefined}
          aria-describedby={ajuda ? idAjuda : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-body font-semibold tabular-nums text-ink outline-none placeholder:font-normal placeholder:text-ink-muted"
          {...input}
        />
      </div>
      {ajuda && (
        <p id={idAjuda} className={cx('text-body-sm', erro ? 'text-perigo-ink' : 'text-ink-muted')}>
          {ajuda}
        </p>
      )}
    </div>
  )
}
