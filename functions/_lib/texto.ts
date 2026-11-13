// Busca por texto sem depender de acento nem de maiúsculas: "tenis" acha "Tênis".
// O SQLite do D1 não tem unaccent; com o catálogo da demo (centenas de itens), comparar no
// código é simples e rápido. Com um catálogo grande, a evolução é uma coluna normalizada.

const PALAVRAS_VAZIAS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas',
  'com', 'para', 'pra', 'por', 'tem', 'quero', 'procuro', 'algum', 'alguma',
])

export function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/** Termos da busca: sem acento, sem palavras vazias e sem o plural simples ("jaquetas" → "jaqueta"). */
export function termosDaBusca(q: string): string[] {
  return normalizar(q)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t && !PALAVRAS_VAZIAS.has(t))
    .map((t) => (t.length > 3 && /[aeo]s$/.test(t) ? t.slice(0, -1) : t))
}

/** Todos os textos de um JSON (atributos do produto), para a busca achar "preto" ou "42". */
export function textosDoJson(valor: unknown): string[] {
  if (valor === null || valor === undefined) return []
  if (typeof valor === 'string' || typeof valor === 'number') return [String(valor)]
  if (Array.isArray(valor)) return valor.flatMap(textosDoJson)
  if (typeof valor === 'object') return Object.values(valor).flatMap(textosDoJson)
  return []
}

/** Lê uma coluna JSON do banco; se vier inválida, devolve o padrão. */
export function lerJson<T>(texto: string | null | undefined, padrao: T): T {
  if (!texto) return padrao
  try {
    return JSON.parse(texto) as T
  } catch {
    return padrao
  }
}
