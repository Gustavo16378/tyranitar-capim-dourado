// O carrinho do caixa (RF19), sem DOM: os itens da compra (reservas que saem agora, produtos do
// catálogo e valores avulsos em "Outros"), o pedido para a API e quais cupons do cliente o caixa
// pode oferecer. A API calcula os descontos e confere tudo de novo (functions/_lib/regras/cupons.ts);
// a regra dos cupons aqui é a mesma, para a tela só oferecer o que vale. Testado em
// tests/unidade/loja-carrinho.test.ts.
import type {
  CupomDoCliente,
  ItemDaCompra,
  ItemPedido,
  OrigemCupom,
  PedidoCompra,
  PreviaCompra,
  ProdutoDaLoja,
  ReservaDaLoja,
  ReservaDoCliente,
} from '../../../tipos/loja'

export type ProdutoNoCarrinho = Pick<ProdutoDaLoja, 'id' | 'nome' | 'categoria' | 'precoCentavos' | 'fotos'>

export type ItemNoCarrinho =
  | { tipo: 'reserva'; reserva: ReservaDoCliente }
  | { tipo: 'produto'; produto: ProdutoNoCarrinho; quantidade: number }
  /** Valor sem produto: não tem categoria, então cupom de categoria não desconta nele. */
  | { tipo: 'outros'; numero: number; valorCentavos: number }

/** O carrinho e o que dá para fazer com ele, do jeito que as duas colunas do Atendimento usam. */
export interface CarrinhoDoCaixa {
  itens: ItemNoCarrinho[]
  /** "Retirar": a reserva entra na compra. */
  retirar: (reservaId: string) => void
  /** Um produto do catálogo (ou mais uma unidade dele). */
  adicionar: (produto: ProdutoNoCarrinho) => void
  tirar: (chave: string) => void
  /** Qualquer outra mudança (quantidade, "Outros"), com a frase para o leitor de tela. */
  trocar: (novo: ItemNoCarrinho[], frase: string) => void
}

/** A API aceita de 1 a 99 unidades de cada produto. */
export const QUANTIDADE_MAXIMA = 99

/** O nome do valor avulso, na compra e no extrato. */
export const DESCRICAO_DE_OUTROS = 'Outros'

/** Identifica o item na lista: "reserva:r1", "produto:p-pulse", "outros:2". */
export function chaveDoItem(item: ItemNoCarrinho) {
  if (item.tipo === 'reserva') return `reserva:${item.reserva.id}`
  if (item.tipo === 'produto') return `produto:${item.produto.id}`
  return `outros:${item.numero}`
}

export function descricaoDoItem(item: ItemNoCarrinho) {
  if (item.tipo === 'reserva') return item.reserva.produto
  if (item.tipo === 'produto') return item.produto.nome
  return DESCRICAO_DE_OUTROS
}

/** O valor do item sem desconto, para mostrar antes da prévia chegar. */
export function brutoDoItem(item: ItemNoCarrinho) {
  if (item.tipo === 'reserva') return item.reserva.brutoCentavos
  if (item.tipo === 'produto') return item.produto.precoCentavos * item.quantidade
  return item.valorCentavos
}

export function temReserva(carrinho: readonly ItemNoCarrinho[], reservaId: string) {
  return carrinho.some((i) => i.tipo === 'reserva' && i.reserva.id === reservaId)
}

/** "Retirar": a reserva entra na compra, uma vez só, e só se a loja já confirmou. */
export function comReserva(carrinho: readonly ItemNoCarrinho[], reserva: ReservaDoCliente): ItemNoCarrinho[] {
  if (!reserva.podeRetirar || temReserva(carrinho, reserva.id)) return [...carrinho]
  return [...carrinho, { tipo: 'reserva', reserva }]
}

/** Um produto do catálogo: entra com 1 unidade; se já está na compra, ganha mais uma. */
export function comProduto(carrinho: readonly ItemNoCarrinho[], produto: ProdutoNoCarrinho): ItemNoCarrinho[] {
  const ja = carrinho.find((i) => i.tipo === 'produto' && i.produto.id === produto.id)
  if (ja && ja.tipo === 'produto') return comQuantidade(carrinho, produto.id, ja.quantidade + 1)
  return [...carrinho, { tipo: 'produto', produto, quantidade: 1 }]
}

/** Muda a quantidade de um produto, de 1 a 99. */
export function comQuantidade(carrinho: readonly ItemNoCarrinho[], produtoId: string, quantidade: number): ItemNoCarrinho[] {
  const nova = Math.min(QUANTIDADE_MAXIMA, Math.max(1, Math.round(quantidade)))
  return carrinho.map((i) => (i.tipo === 'produto' && i.produto.id === produtoId ? { ...i, quantidade: nova } : i))
}

/** Um valor avulso em "Outros". Cada um é um item (dá para tirar um sem mexer nos outros). */
export function comOutros(carrinho: readonly ItemNoCarrinho[], valorCentavos: number): ItemNoCarrinho[] {
  const numero = Math.max(0, ...carrinho.map((i) => (i.tipo === 'outros' ? i.numero : 0))) + 1
  return [...carrinho, { tipo: 'outros', numero, valorCentavos }]
}

export function semItem(carrinho: readonly ItemNoCarrinho[], chave: string): ItemNoCarrinho[] {
  return carrinho.filter((i) => chaveDoItem(i) !== chave)
}

/** O item no formato do pedido (POST /api/loja/compras). */
export function paraPedido(item: ItemNoCarrinho): ItemPedido {
  if (item.tipo === 'reserva') return { reservaId: item.reserva.id }
  if (item.tipo === 'produto') return { produtoId: item.produto.id, quantidade: item.quantidade }
  return { valorCentavos: item.valorCentavos, descricao: DESCRICAO_DE_OUTROS }
}

/** O pedido da compra, na ordem do carrinho; null com o carrinho vazio. */
export function montarPedido(qrToken: string, carrinho: readonly ItemNoCarrinho[], cupons: readonly string[]): PedidoCompra | null {
  if (!carrinho.length) return null
  return { qrToken, itens: carrinho.map(paraPedido), cupons: [...cupons] }
}

// ---------- Cupons (RN05, RN15) ----------

/** O que a regra dos cupons olha em cada item. */
export interface ItemParaCupom {
  /** null em "Outros". */
  categoria: string | null
  /** Pago com Pix antes do balcão: os cupons do caixa não descontam nele. */
  jaPago: boolean
  /** O item já tem o cupom da reserva (com a origem, quando se sabe). */
  cupomDaReserva: { id: string; origem?: OrigemCupom } | null
}

/**
 * O item como a regra dos cupons vê. O cupom da reserva vem às vezes sem a origem; se o mesmo cupom
 * está entre os do cliente, a origem sai de lá.
 */
export function paraCupom(item: ItemNoCarrinho, cupons: readonly CupomDoCliente[] = []): ItemParaCupom {
  if (item.tipo === 'reserva') {
    const { categoria, pago, cupom } = item.reserva
    const origem = cupom?.origem ?? cupons.find((c) => c.id === cupom?.id)?.origem
    return { categoria, jaPago: pago, cupomDaReserva: cupom ? { id: cupom.id, ...(origem && { origem }) } : null }
  }
  if (item.tipo === 'produto') return { categoria: item.produto.categoria, jaPago: false, cupomDaReserva: null }
  return { categoria: null, jaPago: false, cupomDaReserva: null }
}

/**
 * Se o cupom desconta no item, como a API decide (itemAceitaCupom): o da loja com categoria, só nos
 * itens dela; o da loja sem categoria e o voucher do shopping, em todos. Item já pago com Pix ou
 * com o cupom da reserva fica de fora.
 */
export function itemAceitaCupom(item: ItemParaCupom, cupom: Pick<CupomDoCliente, 'origem' | 'categoria'>) {
  if (item.jaPago || item.cupomDaReserva) return false
  return cupom.origem === 'SHOPPING' || !cupom.categoria || item.categoria === cupom.categoria
}

/** As origens que as reservas da compra já ocupam: no máximo um cupom da loja e um voucher, contando os delas. */
export function origensOcupadas(itens: readonly ItemParaCupom[]) {
  return new Set(itens.flatMap((i) => (i.cupomDaReserva?.origem ? [i.cupomDaReserva.origem] : [])))
}

/**
 * Os cupons que o caixa pode oferecer agora: os que têm pelo menos um item em que descontam, e de
 * um lado (loja ou shopping) que o cupom de uma reserva da compra ainda não ocupa. Carrinho vazio:
 * nenhum.
 */
export function cuponsQueValem(cupons: readonly CupomDoCliente[], itens: readonly ItemParaCupom[]) {
  const ocupadas = origensOcupadas(itens)
  return cupons.filter((c) => !ocupadas.has(c.origem) && itens.some((i) => itemAceitaCupom(i, c)))
}

/** Alguma reserva tem cupom sem a origem (o atendimento da API ainda não manda). */
export function faltaOrigem(reservas: readonly ReservaDoCliente[]) {
  return reservas.some((r) => r.cupom && !r.cupom.origem)
}

/**
 * O cupom de cada reserva com a origem. Sem ela, o caixa não sabe se o cupom da reserva já é o
 * cupom da loja da compra (e ofereceria outro, que a API recusa): ela sai da lista de reservas da
 * loja (GET /api/loja/reservas), que já traz a origem.
 */
export function completarOrigens(
  reservas: readonly ReservaDoCliente[],
  daLoja: readonly Pick<ReservaDaLoja, 'id' | 'cupom'>[] | null | undefined,
): ReservaDoCliente[] {
  if (!daLoja) return [...reservas]
  return reservas.map((r) => {
    if (!r.cupom || r.cupom.origem) return r
    const origem = daLoja.find((d) => d.id === r.id)?.cupom?.origem
    return origem ? { ...r, cupom: { ...r.cupom, origem } } : r
  })
}

/** O cupom escolhido de cada lado; null é "sem cupom". */
export type EscolhaDeCupons = Record<OrigemCupom, string | null>

export const SEM_CUPONS: EscolhaDeCupons = { LOJA: null, SHOPPING: null }

/**
 * Os ids que vão no pedido: o escolhido de cada lado, se ainda vale (tirar o tênis tira junto o
 * cupom de calçados). O da loja primeiro, como a API responde.
 */
export function cuponsEscolhidos(escolha: EscolhaDeCupons, validos: readonly CupomDoCliente[]) {
  return (['LOJA', 'SHOPPING'] as const).flatMap((origem) => {
    const id = escolha[origem]
    return id && validos.some((c) => c.id === id && c.origem === origem) ? [id] : []
  })
}

// ---------- A prévia, item por item ----------

/**
 * O item da prévia de cada item do carrinho, pela identidade (a reserva, o produto, o n-ésimo
 * "Outros"), para não trocar um pelo outro quando a prévia é de um carrinho anterior. undefined
 * para o item que a prévia ainda não tem.
 */
export function previaDosItens(carrinho: readonly ItemNoCarrinho[], previa: Pick<PreviaCompra, 'itens'> | null) {
  if (!previa) return carrinho.map(() => undefined)
  const avulsos = previa.itens.filter((i) => !i.reservaId && !i.produtoId)
  let outros = 0
  return carrinho.map((item): ItemDaCompra | undefined => {
    if (item.tipo === 'reserva') return previa.itens.find((i) => i.reservaId === item.reserva.id)
    if (item.tipo === 'produto') return previa.itens.find((i) => !i.reservaId && i.produtoId === item.produto.id)
    return avulsos[outros++]
  })
}

/** O nome de cada cupom que pode aparecer num desconto: os do cliente e os presos às reservas. */
export function nomesDosCupons(cupons: readonly CupomDoCliente[], reservas: readonly ReservaDoCliente[]) {
  const nomes = new Map<string, string>()
  for (const r of reservas) if (r.cupom) nomes.set(r.cupom.id, r.cupom.titulo)
  for (const c of cupons) nomes.set(c.id, c.titulo)
  return nomes
}
