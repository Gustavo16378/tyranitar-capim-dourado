import { Button, formatarNumero } from '../../componentes'

interface PaginacaoProps {
  pagina: number
  tamanho: number
  total: number
  aoMudar: (pagina: number) => void
}

/** Anterior e próxima de uma lista paginada ({ itens, total }). Some quando cabe tudo numa página. */
export function Paginacao({ pagina, tamanho, total, aoMudar }: PaginacaoProps) {
  const paginas = Math.ceil(total / tamanho)
  if (paginas <= 1) return null
  const de = (pagina - 1) * tamanho + 1
  const ate = Math.min(pagina * tamanho, total)
  return (
    <nav aria-label="Páginas" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-body-sm text-ink-muted">
        {formatarNumero(de)} a {formatarNumero(ate)} de {formatarNumero(total)}
      </p>
      <div className="flex gap-2">
        <Button size="sm" disabled={pagina <= 1} onClick={() => aoMudar(pagina - 1)}>
          Anterior
        </Button>
        <Button size="sm" disabled={pagina >= paginas} onClick={() => aoMudar(pagina + 1)}>
          Próxima
        </Button>
      </div>
    </nav>
  )
}
