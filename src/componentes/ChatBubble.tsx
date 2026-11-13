import type { ReactNode } from 'react'
import { CapiMark } from './CapiMark'
import { cx } from './cx'

export interface ChatBubbleProps {
  de?: 'capi' | 'cliente'
  /** Descrição da foto ou print enviado, lida pelo leitor de tela. */
  anexo?: string
  digitando?: boolean
  children?: ReactNode
}

const PONTO = 'size-1.5 rounded-full bg-ink-muted animate-digitando motion-reduce:animate-none motion-reduce:opacity-60'

export function ChatBubble({ de = 'capi', anexo, digitando, children }: ChatBubbleProps) {
  const capi = de !== 'cliente'
  return (
    <div className={cx('flex max-w-full items-end gap-2', !capi && 'justify-end')}>
      {capi && (
        <span role="img" aria-label="Capi" className="grid size-8 flex-none place-items-center rounded-full bg-terra">
          <CapiMark className="size-[22px]" />
        </span>
      )}
      {digitando ? (
        <div
          role="status"
          className="inline-flex gap-1 rounded-md rounded-bl border border-line bg-surface-raised p-3.5"
        >
          <span className="sr-only">Capi está digitando</span>
          <i aria-hidden="true" className={PONTO} />
          <i aria-hidden="true" className={cx(PONTO, '[animation-delay:150ms]')} />
          <i aria-hidden="true" className={cx(PONTO, '[animation-delay:300ms]')} />
        </div>
      ) : (
        <div
          className={cx(
            'max-w-[280px] rounded-md px-3.5 py-2.5 text-body',
            capi ? 'rounded-bl border border-line bg-surface-raised' : 'rounded-br bg-ouro-soft text-ink',
          )}
        >
          {anexo && (
            <span role="img" aria-label={anexo} className="mb-2 block h-[120px] w-40 rounded-sm bg-surface-sunken" />
          )}
          {children}
        </div>
      )}
    </div>
  )
}
