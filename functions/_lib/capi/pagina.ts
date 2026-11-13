// RF04: link de produto. O servidor abre a página e lê título, imagem e preço pelas tags
// Open Graph (og:title, og:image, product:price:amount) ou pelo JSON-LD de Product.

export interface DadosDaPagina {
  url: string
  titulo: string | null
  imagem: string | null
  /** Preço como aparece na página, sem converter ("399.90"). */
  preco: string | null
  moeda: string | null
  descricao: string | null
}

const ENTIDADES: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>' }
const decodificar = (t: string) =>
  t.replace(/&(amp|quot|#39|apos|lt|gt);/g, (e) => ENTIDADES[e]).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))

/** Conteúdo de uma <meta> pelo property ou name, em qualquer ordem de atributos. */
function meta(html: string, nome: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const chave = tag.match(/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1]
    if (chave?.toLowerCase() !== nome) continue
    const valor = tag.match(/\bcontent\s*=\s*(["'])(.*?)\1/is)?.[2]
    if (valor?.trim()) return decodificar(valor.trim())
  }
  return null
}

/** O primeiro Product do JSON-LD da página, se houver. */
function produtoJsonLd(html: string): Record<string, unknown> | null {
  for (const [, bloco] of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const dados = JSON.parse(bloco)
      const itens: unknown[] = Array.isArray(dados) ? dados : dados['@graph'] ?? [dados]
      const produto = itens.find((i) => i && typeof i === 'object' && (i as Record<string, unknown>)['@type'] === 'Product')
      if (produto) return produto as Record<string, unknown>
    } catch {
      // JSON-LD quebrado: segue para o próximo bloco
    }
  }
  return null
}

function absoluta(endereco: string | null, base: string) {
  if (!endereco) return null
  try {
    return new URL(endereco, base).toString()
  } catch {
    return null
  }
}

export function extrairDadosDaPagina(html: string, url: string): DadosDaPagina {
  const ld = produtoJsonLd(html)
  const oferta = (Array.isArray(ld?.offers) ? ld?.offers[0] : ld?.offers) as Record<string, unknown> | undefined
  const imagemLd = Array.isArray(ld?.image) ? ld?.image[0] : ld?.image
  const tituloHtml = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()
  return {
    url,
    titulo: meta(html, 'og:title') ?? (typeof ld?.name === 'string' ? ld.name : null) ?? (tituloHtml ? decodificar(tituloHtml) : null),
    imagem: absoluta(meta(html, 'og:image') ?? (typeof imagemLd === 'string' ? imagemLd : null), url),
    preco:
      meta(html, 'product:price:amount') ??
      meta(html, 'og:price:amount') ??
      (oferta?.price !== undefined ? String(oferta.price) : null),
    moeda: meta(html, 'product:price:currency') ?? meta(html, 'og:price:currency') ?? (typeof oferta?.priceCurrency === 'string' ? oferta.priceCurrency : null),
    descricao: meta(html, 'og:description') ?? meta(html, 'description'),
  }
}

/** Palavras do caminho que não dizem o que é o produto. */
const VAZIAS = new Set(['produto', 'produtos', 'item', 'html', 'htm', 'php', 'aspx', 'www', 'shop', 'loja', 'dp', 'p'])

/**
 * Palavras do endereço de um produto: "https://loja.com/tenis-corrida-pulse-preto/p" → "tenis corrida
 * pulse preto". Muita loja grande bloqueia a leitura da página; o endereço quase sempre diz o produto.
 */
export function palavrasDoEndereco(link: string) {
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

export type LerPagina = (url: string, signal?: AbortSignal) => Promise<DadosDaPagina | null>

const PAGINA_MAXIMA_BYTES = 1_500_000

/** Abre a página do link (até 5 s e 1,5 MB). Qualquer falha devolve null: a Capi segue sem os dados. */
export const lerPaginaDeProduto: LerPagina = async (url, signal) => {
  try {
    const sinais = [AbortSignal.timeout(5000), ...(signal ? [signal] : [])]
    const resposta = await fetch(url, {
      headers: { 'User-Agent': 'CapiBot/1.0 (assistente de compras do shopping)', Accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.any(sinais),
    })
    if (!resposta.ok || !resposta.body || !(resposta.headers.get('content-type') ?? '').includes('html')) return null
    const leitor = resposta.body.getReader()
    const partes: Uint8Array[] = []
    let total = 0
    while (total < PAGINA_MAXIMA_BYTES) {
      const { done, value } = await leitor.read()
      if (done) break
      partes.push(value)
      total += value.length
    }
    await leitor.cancel().catch(() => {})
    const html = new TextDecoder().decode(
      partes.reduce((tudo, parte) => {
        const junto = new Uint8Array(tudo.length + parte.length)
        junto.set(tudo)
        junto.set(parte, tudo.length)
        return junto
      }, new Uint8Array()),
    )
    return extrairDadosDaPagina(html, resposta.url || url)
  } catch {
    return null
  }
}
