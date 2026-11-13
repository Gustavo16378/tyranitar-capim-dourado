import { cx } from './cx'
import type { Nivel } from './nivel'
import { NivelBadge } from './NivelBadge'

export interface CupomTicketProps {
  /** loja: cupom de uma loja; shopping: voucher que vale em qualquer loja. */
  origem?: 'loja' | 'shopping'
  titulo: string
  loja?: string
  /** Como aparece no canhoto: "10%", "R$ 20", "2 h". */
  desconto: string
  /** Data curta: "31/12". */
  validade: string
  /** Nível mínimo para usar o cupom. */
  nivel?: Nivel
}

// Os dois furos do canhoto, em cima e embaixo da linha tracejada.
const FURO =
  "before:absolute before:-top-2 before:left-[88px] before:size-3.5 before:rounded-full before:border before:border-line before:bg-surface before:content-[''] " +
  "after:absolute after:-bottom-2 after:left-[88px] after:size-3.5 after:rounded-full after:border after:border-line after:bg-surface after:content-['']"

/** Ocupa a largura do pai (no design system, 340 px). */
export function CupomTicket({ origem = 'loja', titulo, loja, desconto, validade, nivel }: CupomTicketProps) {
  const shopping = origem === 'shopping'
  return (
    <article
      className={cx(
        'relative grid w-full grid-cols-[96px_1fr] rounded-md border border-line bg-surface-raised shadow-card',
        FURO,
      )}
    >
      <div
        className={cx(
          'grid place-items-center rounded-l-[calc(var(--radius-md)-1px)] border-r-2 border-dashed border-line p-3 text-center',
          shopping ? 'bg-terra text-on-terra' : 'bg-ouro-soft text-ouro-ink',
        )}
      >
        <div>
          <strong className="block text-title-md">{desconto}</strong>
          <span className="text-caption font-semibold">{shopping ? 'do shopping' : 'na loja'}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 px-4 py-3">
        <h3 className="text-label">{titulo}</h3>
        <span className="text-body-sm text-ink-muted">
          {shopping ? 'Vale em qualquer loja' : loja} · até {validade}
        </span>
        {nivel && (
          <span>
            <NivelBadge nivel={nivel} />
          </span>
        )}
      </div>
    </article>
  )
}
