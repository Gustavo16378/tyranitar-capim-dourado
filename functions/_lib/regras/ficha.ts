// RN04: o que o vendedor vê da ficha do cliente, e como a Capi atualiza a ficha.
import { normalizar } from '../texto'

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

/** Junta interesses novos aos atuais: sem repetir a mesma frase e ficando com os mais recentes. */
export function juntarInteresses(atuais: Interesse[], novos: Interesse[], maximo = 12): Interesse[] {
  const porFrase = new Map<string, Interesse>()
  for (const interesse of [...atuais, ...novos]) {
    const chave = normalizar(interesse.detalhe).replace(/\s+/g, ' ').trim()
    porFrase.delete(chave)
    porFrase.set(chave, { categoria: interesse.categoria.trim().toLowerCase(), detalhe: interesse.detalhe.trim() })
  }
  return [...porFrase.values()].slice(-maximo)
}
