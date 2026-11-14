import { forwardRef } from 'react'
import { Link } from 'react-router'
import { listarCompras, useDados } from '../api'
import { Badge, formatarPreco } from '../componentes'
import type { CompraDoCliente } from '../tipos'
import { CAMINHO_DAS_COMPRAS } from './caminhos'
import { Carregando, ErroTela, Esqueleto, Vazio } from './Estados'
import { dataDaCompra, nomeDoPiso, pontosGanhos } from './formatos'

/** Quantas compras a Carteira mostra; "Ver tudo" abre a lista inteira. */
const NA_CARTEIRA = 3

/**
 * Uma compra: a loja, o dia, o valor pago, os cupons usados (com o desconto de cada um) e os
 * pontos ganhos. O ref deixa a lista inteira pôr o foco na primeira compra que chegou.
 */
export const ItemDaCompra = forwardRef<HTMLLIElement, { compra: CompraDoCliente }>(function ItemDaCompra(
  { compra },
  ref,
) {
  return (
    <li
      ref={ref}
      tabIndex={ref ? -1 : undefined}
      className="flex flex-col gap-2 rounded-md border border-line bg-surface-raised p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-label">{compra.loja.nome}</span>
          <span className="block text-body-sm text-ink-muted">
            {dataDaCompra(compra.criadoEm)} · {nomeDoPiso(compra.loja.piso)}
          </span>
        </span>
        <span className="flex-none text-right">
          <span className="block text-caption text-ink-muted">Pago</span>
          <span className="block whitespace-nowrap text-price">{formatarPreco(compra.valorPagoCentavos)}</span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {compra.cupons.map((cupom, i) => (
          <Badge key={`${i}-${cupom.titulo}`} tone="ouro" icon="ticket">
            {cupom.titulo} · −{formatarPreco(cupom.descontoCentavos)}
          </Badge>
        ))}
        <Badge tone="cerrado">{pontosGanhos(compra.pontosGerados)}</Badge>
      </div>
    </li>
  )
})

/** Minhas compras, na Carteira abaixo das reservas: as últimas compras e "Ver tudo". */
export function MinhasCompras() {
  const compras = useDados(() => listarCompras({ tamanho: NA_CARTEIRA }), 'compras-na-carteira')
  return (
    <section aria-labelledby="titulo-compras" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-compras" className="text-title-sm text-marrom-ink">
          Minhas compras
        </h2>
        {compras.tipo === 'ok' && compras.dados.total > 0 && (
          <Link to={CAMINHO_DAS_COMPRAS} className="text-label text-marrom-ink underline underline-offset-2">
            Ver tudo ({compras.dados.total})
          </Link>
        )}
      </div>
      {compras.tipo === 'carregando' && (
        <Carregando className="flex flex-col gap-3">
          <Esqueleto className="h-[92px]" />
        </Carregando>
      )}
      {compras.tipo === 'erro' && <ErroTela erro={compras.erro} onTentar={compras.recarregar} />}
      {compras.tipo === 'ok' &&
        (compras.dados.itens.length === 0 ? (
          <Vazio>Nenhuma compra ainda. Mostre o QR da carteira no caixa para juntar pontos.</Vazio>
        ) : (
          <ul className="flex flex-col gap-3">
            {compras.dados.itens.map((compra) => (
              <ItemDaCompra key={compra.id} compra={compra} />
            ))}
          </ul>
        ))}
    </section>
  )
}
