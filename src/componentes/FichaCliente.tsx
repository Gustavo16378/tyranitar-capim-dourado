import type { ReactNode } from 'react'
import type { Nivel } from './nivel'
import { NivelBadge } from './NivelBadge'

export interface FichaClienteProps {
  nome: string
  nivel: Nivel
  /** Interesses já filtrados pelas categorias da loja, em frases curtas. Nunca a conversa. */
  interesses: string[]
  acoes?: ReactNode
}

/** Ocupa a largura do pai (no design system, 380 px). */
export function FichaCliente({ nome, nivel, interesses, acoes }: FichaClienteProps) {
  return (
    <section
      aria-label="Ficha do cliente"
      className="flex w-full flex-col gap-4 rounded-md border border-line bg-surface-raised p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-title-sm">{nome}</h3>
        <NivelBadge nivel={nivel} />
      </div>
      <div>
        <p className="mb-2 text-caption font-semibold uppercase tracking-wider text-ink-muted">Procura nesta loja</p>
        {interesses.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {interesses.map((interesse) => (
              <li
                key={interesse}
                className="flex items-start gap-2 text-body before:mt-2 before:size-2 before:flex-none before:rounded-full before:bg-ouro before:content-['']"
              >
                {interesse}
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-sm bg-surface-sunken p-3 text-body-sm text-ink-muted">
            O cliente não compartilhou preferências. Atenda normalmente.
          </div>
        )}
      </div>
      {acoes}
    </section>
  )
}
