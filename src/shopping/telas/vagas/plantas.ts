/// <reference types="vite/client" />
// As plantas dos pisos (src/mapa/piso-1.svg e piso-2.svg, em metros), lidas só se estiverem no
// projeto: o import.meta.glob devolve uma lista vazia quando a pasta não existe, e a tela das
// vagas mostra os cartões sem a planta. Cada polígono de loja tem como id o mapa_id da loja.

export interface LojaNaPlanta {
  mapaId: string
  pontos: string
  /** Média dos vértices, onde vai o marcador. */
  centro: { x: number; y: number }
}

export interface Planta {
  piso: number
  viewBox: { x: number; y: number; largura: number; altura: number }
  /** O contorno do piso (id="piso"). */
  contorno: string | null
  lojas: LojaNaPlanta[]
}

const ARQUIVOS = import.meta.glob<string>('../../../mapa/piso-*.svg', { query: '?raw', import: 'default' })

/** Lê o texto de uma planta; null se não der para ler. */
export function lerPlanta(caminho: string, svg: string): Planta | null {
  const piso = Number(caminho.match(/piso-(\d+)\.svg$/)?.[1])
  const caixa = svg.match(/viewBox="([^"]+)"/)?.[1]?.trim().split(/[\s,]+/).map(Number)
  if (!piso || !caixa || caixa.length !== 4 || caixa.some((n) => !Number.isFinite(n))) return null
  const [x, y, largura, altura] = caixa
  let contorno: string | null = null
  const lojas: LojaNaPlanta[] = []
  for (const [poligono] of svg.matchAll(/<polygon\b[^>]*>/g)) {
    const id = poligono.match(/\bid="([^"]+)"/)?.[1]
    const pontos = poligono.match(/\bpoints="([^"]+)"/)?.[1]
    if (!id || !pontos) continue
    if (id === 'piso') contorno = pontos
    if (!id.startsWith('loja-')) continue
    const numeros = pontos.trim().split(/[\s,]+/).map(Number)
    let somaX = 0
    let somaY = 0
    for (let i = 0; i + 1 < numeros.length; i += 2) {
      somaX += numeros[i]
      somaY += numeros[i + 1]
    }
    const n = Math.floor(numeros.length / 2)
    lojas.push({ mapaId: id, pontos, centro: { x: somaX / n, y: somaY / n } })
  }
  return { piso, viewBox: { x, y, largura, altura }, contorno, lojas }
}

/** As plantas que existirem no projeto, do térreo para cima. Lista vazia se não houver nenhuma. */
export async function carregarPlantas(): Promise<Planta[]> {
  const lidas = await Promise.all(Object.entries(ARQUIVOS).map(async ([caminho, carregar]) => lerPlanta(caminho, await carregar())))
  return lidas.filter((p): p is Planta => p !== null).sort((a, b) => a.piso - b.piso)
}

/**
 * Afasta os pontos que estão a menos de `minimo` um do outro, empurrando cada par para lados
 * opostos, até ninguém se sobrepor (ou 40 voltas). Serve para os marcadores de vagas vizinhas
 * não ficarem um em cima do outro. Pontos iguais se afastam na horizontal.
 */
export function espalhar(pontos: readonly { x: number; y: number }[], minimo: number) {
  const p = pontos.map((q) => ({ ...q }))
  for (let volta = 0; volta < 40; volta++) {
    let mexeu = false
    for (let i = 0; i < p.length; i++) {
      for (let j = i + 1; j < p.length; j++) {
        let dx = p[j].x - p[i].x
        let dy = p[j].y - p[i].y
        let d = Math.hypot(dx, dy)
        if (d >= minimo) continue
        if (d === 0) {
          dx = 1
          dy = 0
          d = 1
        }
        const empurrao = (minimo - Math.hypot(p[j].x - p[i].x, p[j].y - p[i].y)) / 2
        p[i].x -= (dx / d) * empurrao
        p[i].y -= (dy / d) * empurrao
        p[j].x += (dx / d) * empurrao
        p[j].y += (dy / d) * empurrao
        mexeu = true
      }
    }
    if (!mexeu) break
  }
  return p
}
