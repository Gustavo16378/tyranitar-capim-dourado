export interface StatTileProps {
  rotulo: string
  valor: string
  /** Começa com + (subiu) ou - (caiu): "+12%". */
  variacao?: string
  nota?: string
}

export function StatTile({ rotulo, valor, variacao, nota }: StatTileProps) {
  const sobe = variacao?.startsWith('+')
  return (
    <div className="flex min-w-[200px] flex-col gap-1 rounded-md border border-line bg-surface-raised p-5">
      <span className="text-body-sm font-medium text-ink-muted">{rotulo}</span>
      <span className="text-metric">{valor}</span>
      {(variacao || nota) && (
        <span className="text-body-sm font-medium text-ink-muted">
          {variacao && (
            <span className={sobe ? 'text-cerrado-ink' : 'text-perigo-ink'}>
              <span aria-hidden="true">{sobe ? '▲ ' : '▼ '}</span>
              <span className="sr-only">{sobe ? 'Subiu ' : 'Caiu '}</span>
              {variacao.slice(1)}{' '}
            </span>
          )}
          {nota}
        </span>
      )}
    </div>
  )
}
