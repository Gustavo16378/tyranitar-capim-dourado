import type { ReactNode } from 'react'
import { CapiMark } from './CapiMark'
import { CapiTirana } from './CapiTirana'
import { cx } from './cx'

export interface ChatBubbleProps {
  de?: 'capi' | 'cliente'
  /** Descrição da foto ou print enviado, lida pelo leitor de tela. */
  anexo?: string
  digitando?: boolean
  /** A Capi Tirana do easter egg (docs/easter-egg.md): o avatar com chifres e olhos bravos. */
  tirana?: boolean
  children?: ReactNode
}

const PONTO = 'size-1.5 rounded-full bg-ink-muted animate-digitando motion-reduce:animate-none motion-reduce:opacity-60'

export function ChatBubble({ de = 'capi', anexo, digitando, tirana, children }: ChatBubbleProps) {
  const capi = de !== 'cliente'
  return (
    <div className={cx('flex max-w-full items-end gap-2', !capi && 'justify-end')}>
      {capi && (
        <span
          role="img"
          aria-label={tirana ? 'Capi Tirana' : 'Capi'}
          className="grid size-8 flex-none place-items-center rounded-full bg-terra"
        >
          {tirana ? <CapiTirana className="size-[24px]" /> : <CapiMark className="size-[22px]" />}
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
            // pre-line: as quebras de linha da mensagem aparecem; links longos quebram em vez de vazar.
            // A partir de 768 px, na coluna larga da Capi, o balão vai até 28rem.
            'max-w-[280px] whitespace-pre-line rounded-md px-3.5 py-2.5 text-body [overflow-wrap:anywhere] md:max-w-md',
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
