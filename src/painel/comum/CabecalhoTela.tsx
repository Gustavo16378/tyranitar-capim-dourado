import { useContext, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { Badge } from '../../componentes'
import { APP_NOME } from '../../config'
import { ContextoDoPainel, urlNoPainel } from '../painel'

interface CabecalhoTelaProps {
  titulo: string
  /** Uma frase sobre o que se faz na tela. */
  descricao?: string
  /** Fica à direita do título: StatTiles, filtros, a ação principal. */
  children?: ReactNode
}

/**
 * Topo de toda tela de painel: título, descrição e o título da aba do navegador. Com `selo` na
 * lista de telas (navegacao.ts), o aviso ao lado do título, como "Dados de demonstração".
 */
export function CabecalhoTela({ titulo, descricao, children }: CabecalhoTelaProps) {
  const painel = useContext(ContextoDoPainel)
  const { pathname } = useLocation()
  const aba = [titulo, painel?.nome, APP_NOME].filter(Boolean).join(' · ')
  const selo = painel?.telas.find((t) => pathname.startsWith(urlNoPainel(painel, t.caminho)))?.selo
  return (
    <header data-anim className="flex flex-wrap items-start justify-between gap-4">
      <title>{aba}</title>
      <div className="flex max-w-[60ch] flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-title-lg">{titulo}</h1>
          {selo && <Badge>{selo}</Badge>}
        </div>
        {descricao && <p className="text-body-sm text-ink-muted">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap items-start gap-3">{children}</div>}
    </header>
  )
}
