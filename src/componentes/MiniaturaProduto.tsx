import { useState } from 'react'
import { cx } from './cx'

export interface MiniaturaProdutoProps {
  /** A primeira foto do produto (public/produtos/...). Sem foto, ou se ela não carregar, a espiral. */
  foto?: string | null
  className?: string
}

/**
 * A foto pequena de um produto numa lista (painel da loja, reservas): quadrada, com o canto
 * do raio pequeno. Sem foto, a espiral da marca no lugar, como no ProdutoCard. Decorativa: o
 * nome do produto está ao lado. Dê o tamanho por classe (padrão 56 px).
 */
export function MiniaturaProduto({ foto, className }: MiniaturaProdutoProps) {
  const [falhou, setFalhou] = useState<string | null>(null)
  const mostrar = foto && falhou !== foto
  return (
    <span
      aria-hidden="true"
      className={cx('grid size-14 flex-none place-items-center overflow-hidden rounded-sm bg-surface-sunken', className)}
    >
      {mostrar ? (
        <img src={foto} alt="" loading="lazy" decoding="async" onError={() => setFalhou(foto)} className="size-full object-cover" />
      ) : (
        <svg viewBox="0 0 32 32" className="size-3/5" fill="none" stroke="var(--line-strong)" strokeWidth={1.6} strokeLinecap="round">
          <path d="M16 16m-3 0a3 3 0 1 0 6 0a6 6 0 1 0-12 0a9 9 0 1 0 18 0" strokeOpacity={0.8} />
        </svg>
      )}
    </span>
  )
}
