// Os estados que toda tela prevê (docs/telas.md): carregando, vazio e erro.
// O quarto, com dados, é a própria tela.
import type { ReactNode } from 'react'
import { Button, Icon } from '../../componentes'
import { cx } from '../../componentes/cx'
import type { ErroApi } from '../api'

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

/** Vazio: uma frase curta dizendo o que fazer. */
export function Vazio({ children }: { children: ReactNode }) {
  return <p className="rounded-md bg-surface-sunken p-4 text-body-sm text-ink-muted">{children}</p>
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
