import { formatarNumero } from './formatar'
import { NIVEIS, type Nivel } from './nivel'

export interface ProgressoNivelProps {
  pontos: number
  /** Pontos onde começa o nível atual. */
  inicio: number
  /** Pontos onde começa o próximo nível. */
  fim: number
  nivel: Nivel
  proximo: Nivel
}

export function ProgressoNivel({ pontos, inicio, fim, nivel, proximo }: ProgressoNivelProps) {
  const pct = Math.max(0, Math.min(100, Math.round(((pontos - inicio) / (fim - inicio)) * 100)))
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-body-sm text-ink-muted">
        <span>
          Faltam <b className="font-bold text-ink">{formatarNumero(Math.max(0, fim - pontos))} pontos</b> para{' '}
          {NIVEIS[proximo]}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={inicio}
        aria-valuemax={fim}
        aria-valuenow={pontos}
        aria-label={`Progresso até o nível ${NIVEIS[proximo]}`}
        className="h-2.5 overflow-hidden rounded-pill bg-surface-sunken"
      >
        <div data-progresso-barra className="h-full origin-left rounded-pill bg-ouro" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-caption text-ink-muted">
        <span>
          <b className="font-semibold text-ink">{NIVEIS[nivel]}</b> · {formatarNumero(inicio)}
        </span>
        <span>
          {NIVEIS[proximo]} · {formatarNumero(fim)}
        </span>
      </div>
    </div>
  )
}
