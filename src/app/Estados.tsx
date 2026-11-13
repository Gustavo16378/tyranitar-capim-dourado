// Os estados que toda tela prevê além de "com dados" (docs/telas.md › Estados de cada tela).
import type { ReactNode } from 'react'
import type { ErroApi } from '../api'
import { Button, Icon } from '../componentes'
import { cx } from '../componentes/cx'

/** Bloco cinza no formato do conteúdo que ainda vai chegar. */
export function Esqueleto({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cx('animate-pulse rounded-md bg-surface-sunken motion-reduce:animate-none', className)}
    />
  )
}

/** Carregando: esqueletos no formato do conteúdo, sem tela branca. */
export function Carregando({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">Carregando</span>
      {children}
    </div>
  )
}

/** Erro: o que aconteceu e como resolver, com o botão de tentar de novo. */
export function ErroTela({ erro, onTentar }: { erro: ErroApi; onTentar?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-md border border-line bg-surface-raised p-4">
      <p className="flex items-start gap-2 text-body-sm">
        <Icon name="alerta" className="mt-px text-perigo-ink" />
        {erro.mensagem}
      </p>
      {onTentar && (
        <Button size="sm" onClick={onTentar}>
          Tentar de novo
        </Button>
      )}
    </div>
  )
}

/** Vazio: uma frase curta dizendo o que fazer. */
export function Vazio({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-line-strong px-4 py-5 text-center text-body-sm text-ink-muted">
      {children}
    </p>
  )
}
