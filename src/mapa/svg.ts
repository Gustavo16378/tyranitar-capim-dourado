// Leitura das plantas (src/mapa/piso-1.svg e piso-2.svg): o tamanho de cada piso e o polígono de
// cada loja, em metros. O id de cada polígono é o mapa_id da loja no banco.

export interface Ponto2D {
  x: number
  y: number
}

export interface LojaNaPlanta {
  mapaId: string
  pontos: Ponto2D[]
  /** Centro do polígono (média dos vértices), para achar o corredor mais perto. */
  centro: Ponto2D
}

export interface Caixa {
  x: number
  y: number
  largura: number
  altura: number
}

/** O viewBox do SVG: onde fica e o tamanho do piso, em metros. */
export function lerViewBox(svg: string): Caixa {
  const valores = svg.match(/viewBox="([^"]+)"/)?.[1]?.trim().split(/[\s,]+/).map(Number)
  if (!valores || valores.length !== 4 || valores.some((v) => !Number.isFinite(v))) {
    throw new Error('A planta não tem um viewBox válido')
  }
  const [x, y, largura, altura] = valores
  return { x, y, largura, altura }
}

function lerPontos(texto: string): Ponto2D[] {
  const numeros = texto.trim().split(/[\s,]+/).map(Number)
  const pontos: Ponto2D[] = []
  for (let i = 0; i + 1 < numeros.length; i += 2) pontos.push({ x: numeros[i], y: numeros[i + 1] })
  return pontos
}

/** Todos os polígonos de loja da planta (id começando por "loja-"). */
export function lerLojas(svg: string): LojaNaPlanta[] {
  const lojas: LojaNaPlanta[] = []
  for (const [poligono] of svg.matchAll(/<polygon\b[^>]*>/g)) {
    const mapaId = poligono.match(/\bid="([^"]+)"/)?.[1]
    const pontos = poligono.match(/\bpoints="([^"]+)"/)?.[1]
    if (!mapaId?.startsWith('loja-') || !pontos) continue
    const lista = lerPontos(pontos)
    const centro = {
      x: lista.reduce((s, p) => s + p.x, 0) / lista.length,
      y: lista.reduce((s, p) => s + p.y, 0) / lista.length,
    }
    lojas.push({ mapaId, pontos: lista, centro })
  }
  return lojas
}
