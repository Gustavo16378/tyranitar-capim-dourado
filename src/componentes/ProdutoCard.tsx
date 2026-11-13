import { Badge } from './Badge'
import { Button } from './Button'
import { cx } from './cx'
import { formatarPreco } from './formatar'
import { Icon } from './Icon'

export interface ProdutoCardProps {
  nome: string
  loja: string
  piso: string
  precoCentavos: number
  /** 0 mostra "Esgotado" e desliga a ação; 1 ou 2 mostra "Últimas N". */
  estoque?: number
  foto?: string
  /** Selo em ouro quando não há aviso de estoque, como "10% com cupom". */
  selo?: string
  /** Texto do botão de ação (primary). Sem ele, o cartão não tem botão. */
  acao?: string
  onAcao?: () => void
  horizontal?: boolean
}

function FotoVazia() {
  return (
    <svg
      viewBox="0 0 120 90"
      width="60%"
      aria-hidden="true"
      fill="none"
      stroke="var(--line-strong)"
      strokeWidth={1.5}
    >
      <path d="M60 45m-8 0a8 8 0 1 0 16 0a16 16 0 1 0-32 0a24 24 0 1 0 48 0" strokeOpacity={0.7} />
    </svg>
  )
}

/** Ocupa a largura do pai (no design system, 248 px em pé e até 360 px deitado). */
export function ProdutoCard({
  nome,
  loja,
  piso,
  precoCentavos,
  estoque,
  foto,
  selo,
  acao,
  onAcao,
  horizontal,
}: ProdutoCardProps) {
  const seloVisivel =
    estoque === 0 ? (
      <Badge tone="perigo">Esgotado</Badge>
    ) : estoque != null && estoque <= 2 ? (
      <Badge tone="aviso">Últimas {estoque}</Badge>
    ) : selo ? (
      <Badge tone="ouro">{selo}</Badge>
    ) : null

  return (
    <article
      className={cx(
        'flex w-full overflow-hidden rounded-md border border-line bg-surface-raised shadow-card',
        horizontal ? 'flex-row' : 'flex-col',
      )}
    >
      <div
        className={cx(
          'relative grid place-items-center overflow-hidden bg-surface-sunken',
          horizontal ? 'w-[104px] flex-none' : 'aspect-[4/3]',
        )}
      >
        {foto ? <img src={foto} alt="" className="size-full object-cover" /> : <FotoVazia />}
        {!horizontal && seloVisivel && <div className="absolute left-2 top-2">{seloVisivel}</div>}
      </div>
      <div className={cx('flex flex-col gap-0.5 px-4 pb-4 pt-3', horizontal && 'min-w-0 flex-1')}>
        <h3 className="text-label">{nome}</h3>
        <span className="flex items-center gap-1 text-body-sm text-ink-muted [&>svg]:size-3.5">
          <Icon name="pin" />
          {loja} · {piso}
        </span>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="whitespace-nowrap text-price text-ink">{formatarPreco(precoCentavos)}</span>
          {acao && (
            <Button variant="primary" size="sm" disabled={estoque === 0} onClick={onAcao}>
              {acao}
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
