// RN05, RN06 e RF19: validade dos cupons e o cálculo dos descontos de uma compra.
import { ErroApi } from '../erros'
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

/**
 * Aplica os cupons de uma compra. No máximo um cupom da loja e um voucher do shopping (RN05).
 * O cupom da loja calcula sobre o valor bruto; o voucher é descontado depois, sobre o que
 * sobrou. O valor pago nunca fica negativo.
 */
export function aplicarCupons(valorBrutoCentavos: number, cupons: Cupom[], ctx: ContextoCompra): ResultadoCupons {
  if (!Number.isInteger(valorBrutoCentavos) || valorBrutoCentavos <= 0) {
    throw new ErroApi('DADOS_INVALIDOS', 'O valor da compra precisa ser maior que zero.')
  }
  if (new Set(cupons.map((c) => c.id)).size !== cupons.length) {
    throw new ErroApi('CUPONS_INCOMPATIVEIS', 'O mesmo cupom foi informado duas vezes.')
  }
  for (const cupom of cupons) {
    const motivo = motivoCupomInvalido(cupom, ctx)
    if (motivo) throw new ErroApi('CUPOM_INVALIDO', motivo)
  }
  const daLoja = cupons.filter((c) => c.lojaId !== null)
  const doShopping = cupons.filter((c) => c.lojaId === null)
  if (daLoja.length > 1) throw new ErroApi('CUPONS_INCOMPATIVEIS', 'Só dá para usar um cupom da loja por compra.')
  if (doShopping.length > 1) {
    throw new ErroApi('CUPONS_INCOMPATIVEIS', 'Só dá para usar um voucher do shopping por compra.')
  }

  const descontos: Desconto[] = []
  let restante = valorBrutoCentavos
  for (const cupom of [...daLoja, ...doShopping]) {
    const base = cupom.lojaId === null ? restante : valorBrutoCentavos
    const centavos = Math.min(desconto(cupom, base), restante)
    descontos.push({ cupomId: cupom.id, centavos })
    restante -= centavos
  }

  return {
    valorBrutoCentavos,
    descontos,
    valorPagoCentavos: restante,
    reembolsos: descontos.filter((d) => d.centavos > 0 && doShopping.some((c) => c.id === d.cupomId)),
  }
}
