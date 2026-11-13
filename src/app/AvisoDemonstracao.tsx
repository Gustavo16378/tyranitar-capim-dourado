import { cx } from '../componentes/cx'
import { MODO_DEMO } from './modoDemo'

/**
 * Em letra pequena: os produtos, os preços e as buscas do seed são inventados. Só aparece com o
 * modo demonstração ligado (VITE_MODO_DEMO=1); fica no rodapé da tela de entrar e no produto.
 */
export function AvisoDemonstracao({ className }: { className?: string }) {
  if (!MODO_DEMO) return null
  return (
    <p className={cx('text-center text-caption text-ink-muted', className)}>
      Produtos, preços e buscas fictícios, para demonstração.
    </p>
  )
}
