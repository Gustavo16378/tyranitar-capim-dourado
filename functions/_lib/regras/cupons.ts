// RN05, RN06, RN15 e RF19: validade dos cupons e o cálculo dos descontos de uma compra, item por
// item. O cupom da loja com categoria só desconta nos itens dessa categoria; sem categoria, na compra
// toda da loja. No máximo um cupom da loja e um voucher do shopping por compra; o voucher desconta
// sobre o que sobrou depois do cupom da loja.
import { ErroApi } from '../erros'
import { rotuloDaCategoria } from './categorias'
import { dataEmPalmas } from './datas'
import { nivelAtende, type NivelFidelidade } from './niveis'

export interface Cupom {
  id: string
  titulo: string
  /** null: voucher do shopping, vale em qualquer loja. */
  lojaId: string | null
  tipo: 'PERCENTUAL' | 'VALOR' | 'BRINDE'
  /** PERCENTUAL: 1 a 100; VALOR: centavos; BRINDE: 0. */
  valor: number
  nivelMinimo: NivelFidelidade
  limitePorCliente: number
  /** Último dia de uso, em Palmas: "2026-12-31". */
  validade: string
  ativo: boolean
  /** Categoria de produto em que o cupom desconta (categoria_alvo); null ou ausente: a compra toda. */
  categoria?: string | null
}

export interface ContextoCompra {
  lojaId: string
  nivelCliente: NivelFidelidade
  /** Quantas vezes o cliente já usou cada cupom, por id. */
  usosDoCliente: Record<string, number>
  agora: Date
}

export interface Desconto {
  cupomId: string
  centavos: number
}

export interface ResultadoCupons {
  valorBrutoCentavos: number
  descontos: Desconto[]
  valorPagoCentavos: number
  /** RN11: voucher do shopping usado na loja vira reembolso do shopping para a loja. */
  reembolsos: Desconto[]
}

/**
 * Se o cliente vê o cupom (vitrine, carteira e balcão): do nível dele, dentro do limite de uso
 * (RN06) e, quando tem categoria-alvo, só se a ficha dele tem essa categoria.
 */
export function clienteVeCupom(
  cupom: { id: string; nivelMinimo: NivelFidelidade; limitePorCliente: number; categoriaAlvo: string | null },
  cliente: { nivel: NivelFidelidade; usos: Record<string, number>; categorias: Iterable<string> },
) {
  return (
    nivelAtende(cliente.nivel, cupom.nivelMinimo) &&
    (cliente.usos[cupom.id] ?? 0) < cupom.limitePorCliente &&
    (cupom.categoriaAlvo === null || new Set(cliente.categorias).has(cupom.categoriaAlvo))
  )
}

/** Por que o cupom não vale nesta compra, ou null se vale (RN06 e nível mínimo). */
export function motivoCupomInvalido(cupom: Cupom, ctx: ContextoCompra): string | null {
  if (!cupom.ativo) return `O cupom "${cupom.titulo}" não está mais ativo.`
  if (dataEmPalmas(ctx.agora) > cupom.validade) return `O cupom "${cupom.titulo}" já venceu.`
  if (cupom.lojaId !== null && cupom.lojaId !== ctx.lojaId) return `O cupom "${cupom.titulo}" é de outra loja.`
  if (!nivelAtende(ctx.nivelCliente, cupom.nivelMinimo)) {
    return `O cupom "${cupom.titulo}" é para clientes do nível ${cupom.nivelMinimo} ou acima.`
  }
  if ((ctx.usosDoCliente[cupom.id] ?? 0) >= cupom.limitePorCliente) {
    return `O cliente já usou o cupom "${cupom.titulo}" o número de vezes permitido.`
  }
  return null
}

/** Desconto de um cupom sobre uma base, nunca maior que ela. */
function desconto(cupom: Cupom, baseCentavos: number) {
  const bruto = cupom.tipo === 'PERCENTUAL' ? Math.floor((baseCentavos * cupom.valor) / 100) : cupom.tipo === 'VALOR' ? cupom.valor : 0
  return Math.min(bruto, baseCentavos)
}

/** Um item da compra, como o caixa monta (docs/api.md › POST /api/loja/compras). */
export interface ItemDaCompra {
  /** Identifica o item na resposta (o id da reserva, do produto, ou "outros-1"). */
  chave: string
  /** Categoria do produto; null no valor avulso ("Outros"), que não entra em cupom de categoria. */
  categoria: string | null
  quantidade: number
  /** Preço de uma unidade, sem desconto. */
  precoCentavos: number
  /** Já pago antes do balcão (reserva com Pix): o caixa não cobra, e os cupons do caixa não descontam nele. */
  jaPago?: boolean
  /** O cupom escolhido na reserva, com o desconto já calculado nela: vale como foi prometido. */
  descontoDaReserva?: Desconto
}

export interface ItemCalculado {
  chave: string
  brutoCentavos: number
  descontos: Desconto[]
  /** Bruto menos os descontos deste item. */
  pagoCentavos: number
  jaPago: boolean
}

export interface ResultadoDosItens extends ResultadoCupons {
  itens: ItemCalculado[]
  /** O que o caixa cobra agora: o valor pago dos itens que ainda não foram pagos. */
  aPagarNoCaixaCentavos: number
}

/** Reparte um desconto entre os itens, na proporção da base de cada um; os centavos que sobram vão
 *  para os primeiros. A soma bate sempre com o total. */
export function repartir(totalCentavos: number, bases: number[]): number[] {
  const soma = bases.reduce((a, b) => a + b, 0)
  if (!soma || !totalCentavos) return bases.map(() => 0)
  const partes = bases.map((b) => Math.floor((totalCentavos * b) / soma))
  let sobra = totalCentavos - partes.reduce((a, b) => a + b, 0)
  for (let i = 0; sobra > 0 && i < partes.length; i++) {
    if (bases[i] > partes[i]) {
      partes[i]++
      sobra--
    }
  }
  return partes
}

/** O texto de para que o cupom vale: "Calçados", ou null na compra toda. */
export function paraQueVale(cupom: Pick<Cupom, 'categoria'>) {
  return cupom.categoria ? rotuloDaCategoria(cupom.categoria) : null
}

/**
 * Se o item pode receber o cupom (RN15): da loja com categoria, só os itens da categoria; sem
 * categoria, todos os da loja; voucher do shopping, todos. Item já pago ou com o cupom da reserva
 * fica de fora.
 */
export function itemAceitaCupom(item: Pick<ItemDaCompra, 'categoria' | 'jaPago' | 'descontoDaReserva'>, cupom: Pick<Cupom, 'lojaId' | 'categoria'>) {
  if (item.jaPago || item.descontoDaReserva) return false
  return !(cupom.lojaId !== null && cupom.categoria) || item.categoria === cupom.categoria
}

/**
 * Aplica os cupons a uma compra com itens (RF19, RN05, RN06 e RN15). `cupons` são todos os da
 * compra: os escolhidos no caixa e os das reservas que saem nela (que já vêm com o desconto em
 * descontoDaReserva e não são conferidos de novo: o preço da reserva foi prometido). No máximo um
 * cupom da loja e um voucher do shopping, contando os das reservas. O da loja calcula sobre os
 * itens que ele aceita; o voucher, sobre o que sobrou deles. O valor pago nunca fica negativo.
 */
export function aplicarCuponsNosItens(itens: ItemDaCompra[], cupons: Cupom[], ctx: ContextoCompra): ResultadoDosItens {
  if (!itens.length) throw new ErroApi('DADOS_INVALIDOS', 'Ponha pelo menos um item na compra.')
  for (const item of itens) {
    if (!Number.isInteger(item.quantidade) || item.quantidade < 1 || !Number.isInteger(item.precoCentavos) || item.precoCentavos < 0) {
      throw new ErroApi('DADOS_INVALIDOS', 'Cada item precisa de quantidade de 1 para cima e preço em centavos.')
    }
  }
  const brutos = itens.map((i) => i.precoCentavos * i.quantidade)
  const valorBrutoCentavos = brutos.reduce((a, b) => a + b, 0)
  if (valorBrutoCentavos <= 0) throw new ErroApi('DADOS_INVALIDOS', 'O valor da compra precisa ser maior que zero.')
  if (new Set(cupons.map((c) => c.id)).size !== cupons.length) {
    throw new ErroApi('CUPONS_INCOMPATIVEIS', 'O mesmo cupom foi informado duas vezes.')
  }
  const daReserva = new Set(itens.flatMap((i) => (i.descontoDaReserva ? [i.descontoDaReserva.cupomId] : [])))
  for (const cupom of cupons) {
    if (daReserva.has(cupom.id)) continue
    const motivo = motivoCupomInvalido(cupom, ctx)
    if (motivo) throw new ErroApi('CUPOM_INVALIDO', motivo)
  }
  const daLoja = cupons.filter((c) => c.lojaId !== null)
  const doShopping = cupons.filter((c) => c.lojaId === null)
  if (daLoja.length > 1) throw new ErroApi('CUPONS_INCOMPATIVEIS', 'Só dá para usar um cupom da loja por compra.')
  if (doShopping.length > 1) {
    throw new ErroApi('CUPONS_INCOMPATIVEIS', 'Só dá para usar um voucher do shopping por compra.')
  }

  const porItem = itens.map((item) => (item.descontoDaReserva ? [{ ...item.descontoDaReserva }] : ([] as Desconto[])))
  const restante = itens.map((_, i) => brutos[i] - porItem[i].reduce((a, d) => a + d.centavos, 0))
  // O da loja primeiro, sobre o bruto dos itens que ele aceita; depois o voucher, sobre o que sobrou.
  for (const cupom of [...daLoja, ...doShopping]) {
    if (daReserva.has(cupom.id)) continue
    const aceitos = itens.map((item) => itemAceitaCupom(item, cupom))
    if (!aceitos.some(Boolean)) {
      const categoria = paraQueVale(cupom)
      throw new ErroApi(
        'CUPOM_INVALIDO',
        categoria
          ? `O cupom "${cupom.titulo}" vale só para ${categoria.toLowerCase()}, e a compra não tem itens dessa categoria.`
          : `O cupom "${cupom.titulo}" não tem item para descontar nesta compra.`,
      )
    }
    const bases = itens.map((_, i) => (aceitos[i] ? restante[i] : 0))
    const total = desconto(cupom, bases.reduce((a, b) => a + b, 0))
    repartir(total, bases).forEach((centavos, i) => {
      if (!aceitos[i]) return
      porItem[i].push({ cupomId: cupom.id, centavos })
      restante[i] -= centavos
    })
  }

  const descontos = cupons.map((cupom) => ({
    cupomId: cupom.id,
    centavos: porItem.flat().filter((d) => d.cupomId === cupom.id).reduce((a, d) => a + d.centavos, 0),
  }))
  // A ordem da resposta: o da loja, depois o voucher.
  descontos.sort((a, b) => Number(doShopping.some((c) => c.id === a.cupomId)) - Number(doShopping.some((c) => c.id === b.cupomId)))
  const calculados = itens.map((item, i) => ({
    chave: item.chave,
    brutoCentavos: brutos[i],
    descontos: porItem[i],
    pagoCentavos: restante[i],
    jaPago: Boolean(item.jaPago),
  }))
  return {
    itens: calculados,
    valorBrutoCentavos,
    descontos,
    valorPagoCentavos: restante.reduce((a, b) => a + b, 0),
    aPagarNoCaixaCentavos: calculados.filter((i) => !i.jaPago).reduce((a, i) => a + i.pagoCentavos, 0),
    reembolsos: descontos.filter((d) => d.centavos > 0 && doShopping.some((c) => c.id === d.cupomId)),
  }
}

/**
 * Os cupons de uma compra de um valor só, sem categoria (como no caixa antes dos itens, e no
 * cálculo da reserva de um produto): um item, e as mesmas regras.
 */
export function aplicarCupons(valorBrutoCentavos: number, cupons: Cupom[], ctx: ContextoCompra, categoria: string | null = null): ResultadoCupons {
  if (!Number.isInteger(valorBrutoCentavos) || valorBrutoCentavos <= 0) {
    throw new ErroApi('DADOS_INVALIDOS', 'O valor da compra precisa ser maior que zero.')
  }
  const { valorBrutoCentavos: bruto, descontos, valorPagoCentavos, reembolsos } = aplicarCuponsNosItens(
    [{ chave: 'compra', categoria, quantidade: 1, precoCentavos: valorBrutoCentavos }],
    cupons,
    ctx,
  )
  return { valorBrutoCentavos: bruto, descontos, valorPagoCentavos, reembolsos }
}
