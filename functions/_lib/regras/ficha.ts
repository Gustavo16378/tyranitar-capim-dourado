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

/** A frase do interesse sem acento, caixa nem espaço repetido: duas frases iguais assim são uma só. */
function chaveDoInteresse(detalhe: string) {
  return normalizar(detalhe).replace(/\s+/g, ' ').trim()
}

/** Junta interesses novos aos atuais: sem repetir a mesma frase e ficando com os mais recentes. */
export function juntarInteresses(atuais: Interesse[], novos: Interesse[], maximo = 12): Interesse[] {
  const porFrase = new Map<string, Interesse>()
  for (const interesse of [...atuais, ...novos]) {
    const chave = chaveDoInteresse(interesse.detalhe)
    porFrase.delete(chave)
    porFrase.set(chave, { categoria: interesse.categoria.trim().toLowerCase(), detalhe: interesse.detalhe.trim() })
  }
  return [...porFrase.values()].slice(-maximo)
}

/**
 * Id de um interesse para o cliente apagar na Minha conta. A ficha guarda só a categoria e a
 * frase; como a frase não se repete na ficha (juntarInteresses), o id sai dela (FNV-1a de 32
 * bits, em base 36): o mesmo interesse tem sempre o mesmo id, mesmo depois de a Capi anotar outros.
 */
export function idDoInteresse({ detalhe }: Pick<Interesse, 'detalhe'>): string {
  let hash = 0x811c9dc5
  for (const caractere of chaveDoInteresse(detalhe)) {
    hash ^= caractere.codePointAt(0)!
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

/** A ficha sem o interesse do id; `removido` diz se ele estava lá. */
export function removerInteresse(interesses: Interesse[], id: string) {
  const restantes = interesses.filter((i) => idDoInteresse(i) !== id)
  return { restantes, removido: restantes.length < interesses.length }
}
