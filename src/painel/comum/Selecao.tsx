import { useId, type ComponentProps } from 'react'
import { cx } from '../../componentes/cx'

interface SelecaoProps extends Omit<ComponentProps<'select'>, 'id'> {
  rotulo: string
  opcoes: readonly { valor: string; rotulo: string }[]
  dica?: string
}

/** Lista de escolha com rótulo, no mesmo formato do Campo (16 px, 44 px de altura). */
export function Selecao({ rotulo, opcoes, dica, className, ...select }: SelecaoProps) {
  const id = useId()
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-label">
        {rotulo}
      </label>
      <select
        id={id}
        aria-describedby={dica ? `${id}-dica` : undefined}
        className="h-11 cursor-pointer rounded-sm border border-line-strong bg-surface-sunken px-3 text-body text-ink"
        {...select}
      >
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
      {dica && (
        <p id={`${id}-dica`} className="text-body-sm text-ink-muted">
          {dica}
        </p>
      )}
    </div>
  )
}
