// A capa de uma categoria de loja: uma foto de loja do tipo (public/capas/<categoria>.webp,
// créditos em docs/creditos.md). Sem categoria, ou se a foto não carregar, a espiral sobre o
// fundo afundado. Decorativa: o nome da categoria está sempre no texto ao lado.
import { useState } from 'react'
import { cx } from '../../componentes/cx'
import { CATEGORIAS_DO_SHOPPING } from './categorias'

function enderecoDaCapa(categoria: string | null | undefined) {
  return categoria && CATEGORIAS_DO_SHOPPING.some((c) => c.id === categoria) ? `/capas/${categoria}.webp` : null
}

export function CapaDaCategoria({ categoria, className }: { categoria: string | null | undefined; className?: string }) {
  const endereco = enderecoDaCapa(categoria)
  const [falhou, setFalhou] = useState<string | null>(null)
  return (
    <span aria-hidden="true" className={cx('grid place-items-center overflow-hidden bg-surface-sunken', className)}>
      {endereco && falhou !== endereco ? (
        <img src={endereco} alt="" loading="lazy" decoding="async" onError={() => setFalhou(endereco)} className="size-full object-cover" />
      ) : (
        <svg viewBox="0 0 32 32" className="h-1/2 max-h-12" fill="none" stroke="var(--line-strong)" strokeWidth={1.6} strokeLinecap="round">
          <path d="M16 16m-3 0a3 3 0 1 0 6 0a6 6 0 1 0-12 0a9 9 0 1 0 18 0" strokeOpacity={0.8} />
        </svg>
      )}
    </span>
  )
}
