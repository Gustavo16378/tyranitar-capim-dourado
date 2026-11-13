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
 * Topo de toda tela de painel: título, descrição e o título da aba do navegador. Na tela que
 * ainda responde com mocks (dadosDeExemplo na lista de telas), o selo "Dados de exemplo".
 */
export function CabecalhoTela({ titulo, descricao, children }: CabecalhoTelaProps) {
  const painel = useContext(ContextoDoPainel)
  const { pathname } = useLocation()
  const aba = [titulo, painel?.nome, APP_NOME].filter(Boolean).join(' · ')
  const exemplo = painel?.telas.find((t) => pathname.startsWith(urlNoPainel(painel, t.caminho)))?.dadosDeExemplo
  return (
    <header data-anim className="flex flex-wrap items-start justify-between gap-4">
      <title>{aba}</title>
      <div className="flex max-w-[60ch] flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-title-lg">{titulo}</h1>
          {exemplo && <Badge>Dados de exemplo</Badge>}
        </div>
        {descricao && <p className="text-body-sm text-ink-muted">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap items-start gap-3">{children}</div>}
    </header>
  )
}
