import { formatarPreco } from '../../componentes/formatar'
import type { CupomComUso, TipoCupom } from '../../tipos/painel'
import { rotuloDaCategoria } from '../comum/categorias'
import { diasAte } from '../comum/formatos'

/** O que vai no canhoto do CupomTicket: "10%", "R$ 15", "R$ 12,50" ou "Brinde". */
export function textoDoDesconto({ tipo, valor }: { tipo: TipoCupom; valor: number }) {
  if (tipo === 'PERCENTUAL') return `${valor}%`
  if (tipo === 'VALOR') return valor % 100 === 0 ? `R$ ${valor / 100}` : formatarPreco(valor)
  return 'Brinde'
}

/** Avisa quando o cupom vence em uma semana ou menos. */
const AVISO_DE_VENCIMENTO = 7

/**
 * Situação do cupom em palavra (nunca só cor): inativo, vencido ou vencendo.
 * null quando ele vale normalmente e não há nada a avisar.
 */
export function situacaoDoCupom(
  { ativo, validade }: Pick<CupomComUso, 'ativo' | 'validade'>,
  hoje: string,
): { tom: 'neutral' | 'aviso'; texto: string; icone?: 'relogio' } | null {
  if (!ativo) return { tom: 'neutral', texto: 'Inativo' }
  const dias = diasAte(validade, hoje)
  if (dias < 0) return { tom: 'neutral', texto: 'Vencido' }
  if (dias === 0) return { tom: 'aviso', texto: 'Vence hoje', icone: 'relogio' }
  if (dias <= AVISO_DE_VENCIMENTO) {
    return { tom: 'aviso', texto: dias === 1 ? 'Vence amanhã' : `Vence em ${dias} dias`, icone: 'relogio' }
  }
  return null
}

/** A linha de onde o cupom vale, no CupomTicket: "Em calçados" ou "Na loja toda". */
export function textoDoAlvo(categoriaAlvo: string | null) {
  return categoriaAlvo ? `Em ${rotuloDaCategoria(categoriaAlvo).toLowerCase()}` : 'Na loja toda'
}

/** Cupom que vale hoje. */
export function cupomValendo(cupom: Pick<CupomComUso, 'ativo' | 'validade'>, hoje: string) {
  return cupom.ativo && cupom.validade >= hoje
}
