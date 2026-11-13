import type { ReactNode } from 'react'
import { APP_NOME } from '../../config'

interface CabecalhoTelaProps {
  titulo: string
  /** Uma frase sobre o que se faz na tela. */
  descricao?: string
  /** Fica à direita do título: StatTiles, filtros, a ação principal. */
  children?: ReactNode
}

/** Topo de toda tela do painel: título, descrição e o título da aba do navegador. */
export function CabecalhoTela({ titulo, descricao, children }: CabecalhoTelaProps) {
  return (
    <header data-anim className="flex flex-wrap items-start justify-between gap-4">
      <title>{`${titulo} · Painel da loja · ${APP_NOME}`}</title>
      <div className="flex max-w-[60ch] flex-col gap-1">
        <h1 className="text-title-lg">{titulo}</h1>
        {descricao && <p className="text-body-sm text-ink-muted">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-3">{children}</div>}
    </header>
  )
}
