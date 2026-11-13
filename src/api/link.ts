// Links de produtos de outras lojas na conversa com a Capi.

const URL_NO_TEXTO = /https?:\/\/[^\s<>"]+/i

/** O primeiro link http(s) de uma mensagem e o resto do texto, sem ele. */
export function separarLink(mensagem: string): { texto: string; link?: string } {
  const achado = mensagem.match(URL_NO_TEXTO)
  if (!achado) return { texto: mensagem.trim() }
  // Pontuação colada no fim ("veja https://loja.com/x.") não faz parte do link.
  const link = achado[0].replace(/[.,;:!?)\]]+$/, '')
  return { texto: mensagem.replace(achado[0], ' ').replace(/\s+/g, ' ').trim(), link }
}

/** O link é um endereço http ou https válido. */
export function linkValido(link: string) {
  try {
    const url = new URL(link.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** Palavras do caminho que não dizem o que é o produto. */
const VAZIAS = new Set(['produto', 'produtos', 'item', 'html', 'htm', 'php', 'aspx', 'www', 'shop', 'loja', 'dp', 'p'])

/**
 * Palavras de busca tiradas do endereço de um produto: "https://loja.com/tenis-corrida-pulse-preto/p"
 * → "tenis corrida pulse preto". É a busca comum quando a Capi não consegue abrir a página.
 */
export function termosDoLink(link: string) {
  let caminho: string
  try {
    caminho = decodeURIComponent(new URL(link).pathname)
  } catch {
    return ''
  }
  return caminho
    .split(/[^\p{L}]+/u)
    .map((palavra) => palavra.toLowerCase())
    .filter((palavra) => palavra.length > 2 && !VAZIAS.has(palavra))
    .join(' ')
}
