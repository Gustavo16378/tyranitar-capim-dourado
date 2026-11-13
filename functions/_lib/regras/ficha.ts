// RN04: o que o vendedor vê da ficha do cliente.

export interface Interesse {
  categoria: string
  detalhe: string
}

/**
 * Só com consentimento, e só os interesses das categorias que a loja vende, em frases curtas.
 * Nunca a conversa com a Capi.
 */
export function filtrarFicha(interesses: Interesse[], categoriasDaLoja: string[], consentimento: boolean): string[] {
  if (!consentimento) return []
  const daLoja = new Set(categoriasDaLoja.map((c) => c.trim().toLowerCase()))
  return interesses.filter((i) => daLoja.has(i.categoria.trim().toLowerCase())).map((i) => i.detalhe)
}
