// Os estados que toda tela prevê (docs/telas.md): carregando, vazio e erro.
// O quarto, com dados, é a própria tela.
import type { ReactNode } from 'react'
import { Button, Icon } from '../../componentes'
import { cx } from '../../componentes/cx'
import type { ErroApi } from '../api/http'
import { IlustracaoVazio, type TemaDaIlustracao } from './IlustracaoVazio'

/**
 * Carregando: blocos no formato do conteúdo, parados (nada se mexe sozinho).
 * Envolva os blocos em <Carregando rotulo="..."> para o leitor de tela anunciar.
 */
export function Esqueleto({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx('rounded-md bg-surface-sunken', className)} />
}

export function Carregando({ rotulo, className, children }: { rotulo: string; className?: string; children: ReactNode }) {
  return (
    <div aria-busy="true" className={className}>
      <span className="sr-only" role="status">
        {rotulo}
      </span>
      {children}
    </div>
  )
}

interface VazioProps {
  /** O desenho, pelo assunto da lista: sacola, cupom, grafico, busca, loja, pessoas ou recibo. */
  ilustracao: TemaDaIlustracao
  /** Dentro de um cartão ou ao lado de outro conteúdo: desenho pequeno, ao lado do texto. */
  compacto?: boolean
  children: ReactNode
}

/** Vazio: um desenho e uma frase curta dizendo o que fazer. */
export function Vazio({ ilustracao, compacto, children }: VazioProps) {
  if (compacto) {
    return (
      <div className="flex items-center gap-3 rounded-md bg-surface-sunken p-3">
        <IlustracaoVazio tema={ilustracao} className="h-12 w-[60px] flex-none" />
        <p className="text-body-sm text-ink-muted">{children}</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-3 rounded-md bg-surface-sunken px-4 py-8 text-center">
      <IlustracaoVazio tema={ilustracao} className="h-24 w-[120px]" />
      <p className="max-w-[46ch] text-body text-ink-muted">{children}</p>
    </div>
  )
}

interface ErroProps {
  erro: ErroApi
  /** Mostra "Tentar de novo". Passe só quando adianta: aoTentarDeNovo={erro.passageiro ? recarregar : undefined}. */
  aoTentarDeNovo?: () => void
  /** Outras ações, ao lado de "Tentar de novo". */
  children?: ReactNode
}

/** Erro: o que aconteceu (a mensagem da API) e como resolver. */
export function Erro({ erro, aoTentarDeNovo, children }: ErroProps) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-md bg-perigo-soft p-4 text-perigo-ink">
      <p className="flex items-start gap-2 text-body-sm font-medium">
        <Icon name="alerta" className="mt-px" />
        {erro.mensagem}
      </p>
      {(aoTentarDeNovo || children) && (
        <div className="flex flex-wrap gap-2">
          {aoTentarDeNovo && (
            <Button size="sm" onClick={aoTentarDeNovo}>
              Tentar de novo
            </Button>
          )}
          {children}
        </div>
      )}
    </div>
  )
}
