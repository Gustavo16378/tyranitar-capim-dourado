// Conversões entre o formato da API e o que os componentes e o lojista leem.
import { formatarPreco, type Nivel } from '../../componentes'
import type { NivelApi } from '../../tipos/loja'

/** A API escreve CAPIM; os componentes recebem capim. */
export function paraNivel(nivel: NivelApi): Nivel {
  return nivel.toLowerCase() as Nivel
}

/**
 * O que o caixa digita, em centavos: "459,80", "459.80", "R$ 1.234,56", "1234".
 * Devolve null se não for um valor em reais.
 */
export function lerValorEmCentavos(texto: string): number | null {
  let limpo = texto.replace(/R\$/i, '').replace(/\s/g, '')
  if (limpo.includes(',')) limpo = limpo.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) limpo = limpo.replace(/\./g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null
  return Math.round(Number(limpo) * 100)
}

/** 45980 → "459,80": o valor no campo, sem o "R$" (que já está no prefixo). */
export function valorParaCampo(centavos: number) {
  return formatarPreco(centavos).replace('R$ ', '')
}
