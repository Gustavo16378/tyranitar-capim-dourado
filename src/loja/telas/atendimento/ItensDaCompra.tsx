import { Badge, Button, formatarPreco, MiniaturaProduto } from '../../../componentes'
import { cx } from '../../../componentes/cx'
import type { DescontoNaCompra, ItemDaCompra, PreviaCompra } from '../../../tipos/loja'
import { Vazio } from '../../../painel/comum/Estados'
import { rotuloDaCategoria } from '../../../painel/comum/categorias'
import { detalheDaReserva } from '../../comum/reserva'
import {
  brutoDoItem,
  chaveDoItem,
  comQuantidade,
  descricaoDoItem,
  previaDosItens,
  QUANTIDADE_MAXIMA,
  type CarrinhoDoCaixa,
  type ItemNoCarrinho,
} from './carrinho'

interface ItensDaCompraProps {
  carrinho: CarrinhoDoCaixa
  previa: PreviaCompra | null
  /** A prévia é de um carrinho anterior: os descontos ficam mais claros até a nova chegar. */
  recalculando: boolean
  /** O nome de cada cupom, pelo id. */
  nomes: ReadonlyMap<string, string>
  /** Primeiro nome do cliente, para a frase do vazio. */
  cliente: string
}

/**
 * Os itens da compra, cada um com o desconto de cada cupom nele (da prévia da API): o cupom da
 * loja só aparece nos itens da categoria dele; o voucher, repartido no que sobrou. Produto do
 * catálogo tem a quantidade; todo item sai com "Tirar".
 */
export function ItensDaCompra({ carrinho, previa, recalculando, nomes, cliente }: ItensDaCompraProps) {
  const calculados = previaDosItens(carrinho.itens, previa)

  if (!carrinho.itens.length) {
    return (
      <Vazio ilustracao="sacola" compacto>
        Nada na compra ainda. Retire uma reserva de {cliente}, busque um produto no catálogo ou informe um valor em Outros.
      </Vazio>
    )
  }

  return (
    <ul aria-label="Itens da compra" aria-busy={recalculando} className="flex flex-col divide-y divide-line">
      {carrinho.itens.map((item, i) => (
        <LinhaDaCompra
          key={chaveDoItem(item)}
          item={item}
          calculado={calculados[i]}
          recalculando={recalculando}
          nomes={nomes}
          carrinho={carrinho}
        />
      ))}
    </ul>
  )
}

interface LinhaDaCompraProps {
  item: ItemNoCarrinho
  calculado: ItemDaCompra | undefined
  recalculando: boolean
  nomes: ReadonlyMap<string, string>
  carrinho: CarrinhoDoCaixa
}

function LinhaDaCompra({ item, calculado, recalculando, nomes, carrinho }: LinhaDaCompraProps) {
  const descricao = descricaoDoItem(item)
  const bruto = calculado?.brutoCentavos ?? brutoDoItem(item)
  // Antes da prévia, a reserva já sabe o próprio desconto; os outros itens, ainda não.
  const final = calculado?.pagoCentavos ?? (item.tipo === 'reserva' ? item.reserva.precoCentavos : bruto)
  const jaPago = calculado?.jaPago ?? (item.tipo === 'reserva' && item.reserva.pago)

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        {item.tipo !== 'outros' && (
          <MiniaturaProduto foto={item.tipo === 'reserva' ? item.reserva.foto : (item.produto.fotos[0] ?? null)} className="size-11" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-label">{descricao}</p>
          <p className="text-body-sm text-ink-muted">{subtitulo(item)}</p>
        </div>
        <div className="flex-none text-right">
          <p className={cx('text-label tabular-nums transition-opacity duration-rapida', recalculando && 'opacity-60')}>
            {formatarPreco(final)}
          </p>
          {final < bruto && <p className="text-caption tabular-nums text-ink-muted">era {formatarPreco(bruto)}</p>}
        </div>
      </div>

      {(jaPago || (calculado && calculado.descontos.some((d) => d.centavos > 0))) && (
        <div className={cx('flex flex-col gap-1 transition-opacity duration-rapida', recalculando && 'opacity-60')}>
          {calculado && <DescontosDoItem descontos={calculado.descontos} nomes={nomes} />}
          {jaPago && (
            <div>
              <Badge tone="cerrado" icon="check">
                Já pago com Pix
              </Badge>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {item.tipo === 'produto' && <Quantidade item={item} carrinho={carrinho} />}
        <Button size="sm" variant="ghost" aria-label={`Tirar ${descricao} da compra`} onClick={() => carrinho.tirar(chaveDoItem(item))}>
          Tirar
        </Button>
      </div>
    </li>
  )
}

/** A linha embaixo do nome: o que é o item. */
function subtitulo(item: ItemNoCarrinho) {
  if (item.tipo === 'reserva') return ['Reserva', detalheDaReserva(item.reserva)].filter(Boolean).join(' · ')
  if (item.tipo === 'produto') {
    const cada = item.quantidade > 1 ? ` · ${formatarPreco(item.produto.precoCentavos)} cada` : ''
    return `${rotuloDaCategoria(item.produto.categoria)}${cada}`
  }
  return 'Sem produto: cupom de categoria não vale'
}

/** O desconto de cada cupom num item: "10% em calçados − R$ 39,99". Brinde (zero) fica de fora. */
export function DescontosDoItem({ descontos, nomes }: { descontos: readonly DescontoNaCompra[]; nomes: ReadonlyMap<string, string> }) {
  const comValor = descontos.filter((d) => d.centavos > 0)
  if (!comValor.length) return null
  return (
    <ul aria-label="Descontos" className="flex flex-col text-body-sm text-cerrado-ink">
      {comValor.map((d) => (
        <li key={d.cupom} className="flex justify-between gap-3">
          <span className="min-w-0">{nomes.get(d.cupom) ?? 'Cupom'}</span>
          <span className="flex-none tabular-nums">− {formatarPreco(d.centavos)}</span>
        </li>
      ))}
    </ul>
  )
}

function Quantidade({ item, carrinho }: { item: Extract<ItemNoCarrinho, { tipo: 'produto' }>; carrinho: CarrinhoDoCaixa }) {
  const { produto, quantidade } = item
  function mudar(nova: number) {
    const unidades = nova === 1 ? '1 unidade' : `${nova} unidades`
    carrinho.trocar(comQuantidade(carrinho.itens, produto.id, nova), `${unidades} de ${produto.nome}.`)
  }
  return (
    <div role="group" aria-label={`Quantidade de ${produto.nome}`} className="flex items-center gap-1">
      <Button
        icon="menos"
        aria-label="Uma unidade a menos"
        disabled={quantidade <= 1}
        onClick={() => mudar(quantidade - 1)}
        className="w-11 !px-0"
      />
      <span className="min-w-8 text-center text-label tabular-nums">{quantidade}</span>
      <Button
        icon="mais"
        aria-label="Uma unidade a mais"
        disabled={quantidade >= QUANTIDADE_MAXIMA}
        onClick={() => mudar(quantidade + 1)}
        className="w-11 !px-0"
      />
    </div>
  )
}
