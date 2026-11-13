import { Badge } from './Badge'
import { cx } from './cx'
import { Icon } from './Icon'
import { MiniaturaProduto } from './MiniaturaProduto'

export interface ReservaStatusProps {
  produto: string
  loja: string
  status: 'PENDENTE' | 'CONFIRMADA' | 'SEPARADA' | 'RETIRADA'
  pago?: boolean
  /** Prazo correndo, como "Expira em 4 h". Quando existe, aparece no lugar do selo de pagamento. */
  prazo?: string
  /** A foto do produto, ao lado do nome. undefined: sem miniatura; null: a espiral no lugar da foto. */
  foto?: string | null
}

const PASSOS = [
  { id: 'PENDENTE', rotulo: 'Reserva feita' },
  { id: 'SEPARADA', rotulo: 'Separada pela loja' },
  { id: 'RETIRADA', rotulo: 'Retirada no balcão' },
] as const

const ESTILO = {
  feito: { item: 'text-ink after:bg-cerrado', ponto: 'border-cerrado bg-cerrado text-on-cerrado' },
  atual: { item: 'font-semibold text-ink after:bg-line', ponto: 'border-ouro bg-ouro-soft' },
  futuro: { item: 'text-ink-muted after:bg-line', ponto: 'border-line-strong bg-surface-raised' },
} as const

/** Ocupa a largura do pai (no design system, 340 px). */
export function ReservaStatus({ produto, loja, status, pago, prazo, foto }: ReservaStatusProps) {
  const atual = status === 'CONFIRMADA' ? 0 : PASSOS.findIndex((p) => p.id === status)
  const retirada = status === 'RETIRADA'
  const tom = status === 'SEPARADA' || retirada ? 'cerrado' : 'ouro'

  return (
    <article className="w-full rounded-md border border-line bg-surface-raised px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {foto !== undefined && <MiniaturaProduto foto={foto} className="size-11" />}
          <div className="min-w-0">
            <div className="text-label">{produto}</div>
            <div className="text-body-sm text-ink-muted">{loja}</div>
          </div>
        </div>
        {prazo ? (
          <Badge tone="aviso" icon="relogio">
            {prazo}
          </Badge>
        ) : (
          <Badge tone={tom} icon="check">
            {pago ? 'Paga' : 'Pagar na loja'}
          </Badge>
        )}
      </div>
      <ol className="mt-3 flex flex-col">
        {PASSOS.map((passo, i) => {
          const estado = i < atual || retirada ? 'feito' : i === atual ? 'atual' : 'futuro'
          return (
            <li
              key={passo.id}
              aria-current={estado === 'atual' ? 'step' : undefined}
              className={cx(
                'relative grid grid-cols-[24px_1fr] gap-3 pb-3 text-body-sm last:pb-0',
                "after:absolute after:bottom-0 after:left-[11px] after:top-6 after:w-0.5 after:content-[''] last:after:hidden",
                ESTILO[estado].item,
              )}
            >
              <span
                className={cx(
                  'relative z-[1] grid size-6 place-items-center rounded-full border-2 [&>svg]:size-3.5',
                  ESTILO[estado].ponto,
                )}
              >
                {estado === 'feito' && <Icon name="check" />}
              </span>
              {passo.rotulo}
            </li>
          )
        })}
      </ol>
    </article>
  )
}
