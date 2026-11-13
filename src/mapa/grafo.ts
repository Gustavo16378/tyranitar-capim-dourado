// Rota dentro do shopping (RF10): o grafo de src/mapa/rotas.json (pontos nas portas, entradas e
// corredores, em metros) e o menor caminho por Dijkstra, da entrada até a porta da loja.

export type TipoDePonto = 'porta' | 'entrada' | 'corredor'
export type Piso = 1 | 2

export interface PontoDoMapa {
  id: string
  x: number
  y: number
  piso: Piso
  tipo: TipoDePonto
  /** Só nas portas: o mapa_id da loja. */
  loja?: string
}

export interface DadosDeRotas {
  pontos: { id: string; x: number; y: number; piso: number; tipo: string; loja?: string }[]
  caminhos: string[][]
}

export interface Grafo {
  pontos: Map<string, PontoDoMapa>
  vizinhos: Map<string, { id: string; metros: number }[]>
}

export interface Rota {
  pontos: PontoDoMapa[]
  metros: number
}

const distancia = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

export function montarGrafo(dados: DadosDeRotas): Grafo {
  const pontos = new Map<string, PontoDoMapa>()
  for (const p of dados.pontos) {
    pontos.set(p.id, { ...p, piso: p.piso === 2 ? 2 : 1, tipo: p.tipo as TipoDePonto })
  }
  const vizinhos = new Map<string, { id: string; metros: number }[]>()
  for (const id of pontos.keys()) vizinhos.set(id, [])
  for (const [a, b] of dados.caminhos) {
    const pa = pontos.get(a)
    const pb = pontos.get(b)
    if (!pa || !pb) continue
    const metros = distancia(pa, pb)
    vizinhos.get(a)!.push({ id: b, metros })
    vizinhos.get(b)!.push({ id: a, metros })
  }
  return { pontos, vizinhos }
}

/** Menor caminho entre dois pontos (Dijkstra). null se não há caminho. */
export function menorCaminho(grafo: Grafo, origem: string, destino: string): Rota | null {
  if (!grafo.pontos.has(origem) || !grafo.pontos.has(destino)) return null
  const dist = new Map<string, number>([[origem, 0]])
  const anterior = new Map<string, string>()
  const abertos = new Set([origem])
  const fechados = new Set<string>()
  while (abertos.size) {
    // Com algumas centenas de pontos, achar o menor numa lista basta.
    let atual = ''
    for (const id of abertos) if (!atual || dist.get(id)! < dist.get(atual)!) atual = id
    abertos.delete(atual)
    if (atual === destino) break
    fechados.add(atual)
    for (const { id, metros } of grafo.vizinhos.get(atual) ?? []) {
      if (fechados.has(id)) continue
      const novo = dist.get(atual)! + metros
      if (novo < (dist.get(id) ?? Infinity)) {
        dist.set(id, novo)
        anterior.set(id, atual)
        abertos.add(id)
      }
    }
  }
  if (!dist.has(destino)) return null
  const caminho = [destino]
  while (caminho[0] !== origem) caminho.unshift(anterior.get(caminho[0])!)
  return { pontos: caminho.map((id) => grafo.pontos.get(id)!), metros: dist.get(destino)! }
}

/**
 * O ponto onde a rota termina: a porta da loja ou, nas lojas sem porta no grafo (as âncoras),
 * o ponto de corredor do mesmo piso mais perto do centro da loja.
 */
export function chegadaDaLoja(grafo: Grafo, mapaId: string, piso: Piso, centro?: { x: number; y: number }) {
  for (const p of grafo.pontos.values()) if (p.tipo === 'porta' && p.loja === mapaId) return p
  if (!centro) return null
  let melhor: PontoDoMapa | null = null
  for (const p of grafo.pontos.values()) {
    if (p.piso !== piso || p.tipo === 'porta') continue
    if (!melhor || distancia(p, centro) < distancia(melhor, centro)) melhor = p
  }
  return melhor
}

/** O ponto do contorno do polígono mais perto de p (a fachada da loja vista dali). */
export function pontoNoContorno(contorno: { x: number; y: number }[], p: { x: number; y: number }) {
  let melhor = contorno[0]
  for (let i = 0; i < contorno.length; i++) {
    const a = contorno[i]
    const b = contorno[(i + 1) % contorno.length]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const t = dx || dy ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy))) : 0
    const candidato = { x: a.x + dx * t, y: a.y + dy * t }
    if (distancia(candidato, p) < distancia(melhor, p)) melhor = candidato
  }
  return melhor
}

/**
 * A rota até a loja, saindo da entrada do piso que deixa o caminho mais curto. Nas lojas sem
 * porta no grafo (as âncoras, fora dos corredores), a rota vai até o ponto mais perto e
 * termina num trecho reto até a fachada da loja, que entra na distância.
 */
export function rotaAteALoja(
  grafo: Grafo,
  mapaId: string,
  piso: Piso,
  loja?: { centro: { x: number; y: number }; pontos: { x: number; y: number }[] },
): Rota | null {
  const chegada = chegadaDaLoja(grafo, mapaId, piso, loja?.centro)
  if (!chegada) return null
  let melhor: Rota | null = null
  for (const p of grafo.pontos.values()) {
    if (p.tipo !== 'entrada' || p.piso !== chegada.piso) continue
    const rota = menorCaminho(grafo, p.id, chegada.id)
    if (rota && (!melhor || rota.metros < melhor.metros)) melhor = rota
  }
  if (!melhor || chegada.tipo === 'porta' || !loja?.pontos.length) return melhor
  const fachada = pontoNoContorno(loja.pontos, chegada)
  return {
    pontos: [...melhor.pontos, { id: `fachada-${mapaId}`, ...fachada, piso: chegada.piso, tipo: 'porta', loja: mapaId }],
    metros: melhor.metros + distancia(chegada, fachada),
  }
}

/** O começo da rota até a fração pedida do comprimento (0 a 1), para desenhar a linha aos poucos. */
export function trechoDaRota(pontos: { x: number; y: number }[], fracao: number): { x: number; y: number }[] {
  if (pontos.length < 2 || fracao >= 1) return pontos
  const total = pontos.slice(1).reduce((soma, p, i) => soma + distancia(pontos[i], p), 0)
  let falta = Math.max(0, fracao) * total
  const trecho = [pontos[0]]
  for (let i = 1; i < pontos.length; i++) {
    const tamanho = distancia(pontos[i - 1], pontos[i])
    if (falta >= tamanho) {
      trecho.push(pontos[i])
      falta -= tamanho
      continue
    }
    const t = tamanho ? falta / tamanho : 0
    trecho.push({ x: pontos[i - 1].x + (pontos[i].x - pontos[i - 1].x) * t, y: pontos[i - 1].y + (pontos[i].y - pontos[i - 1].y) * t })
    break
  }
  return trecho
}

/** Minutos a pé, a 1,2 m/s, arredondado e com no mínimo 1. */
export function minutosAPe(metros: number) {
  return Math.max(1, Math.round(metros / 72))
}
