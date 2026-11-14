// A Loja 13, que só existe no modo tirano: um bloco no átrio do térreo, num corredor livre (o
// ponto p1-c66 do grafo fica a quase 20 m da loja mais próxima), e a trilha de rachaduras que
// leva até ela, saindo da Entrada B pelo caminho dos corredores. Não confunda com a LOJA 13 da
// planta (mapa_id loja-13), que é uma loja de verdade: esta tem outro id.
// Funções puras, testadas em tests/unidade/easter-egg.test.ts.
import { GRAFO } from '../mapa/dados'
import { menorCaminho } from '../mapa/grafo'
import type { Ponto2D } from '../mapa/svg'

export const ID_DA_LOJA_13 = 'tirano-loja-13'

/** A entrada de onde a trilha sai (Entrada B, a do sul, em src/mapa/entradas.ts). */
export const ENTRADA_DA_TRILHA = 'p1-c116'

/** O ponto do corredor ao lado da loja, onde a trilha deixa o grafo. */
const PONTO_DO_ATRIO = 'p1-c66'

/** Centro e meio lado do bloco, em metros (a planta do térreo tem 370 m de largura). */
const CENTRO: Ponto2D = { x: 352.4, y: 236.5 }
const MEIO_LADO = 4.5

export const LOJA_13 = {
  mapaId: ID_DA_LOJA_13,
  piso: 1 as const,
  centro: CENTRO,
  /** O contorno do bloco, no sentido da planta (x para a direita, y para baixo). */
  pontos: [
    { x: CENTRO.x - MEIO_LADO, y: CENTRO.y - MEIO_LADO },
    { x: CENTRO.x + MEIO_LADO, y: CENTRO.y - MEIO_LADO },
    { x: CENTRO.x + MEIO_LADO, y: CENTRO.y + MEIO_LADO },
    { x: CENTRO.x - MEIO_LADO, y: CENTRO.y + MEIO_LADO },
  ] satisfies Ponto2D[],
}

/** A fachada da Loja 13: o meio do lado de baixo, virado para a Entrada B. */
export const FACHADA_DA_LOJA_13: Ponto2D = { x: CENTRO.x, y: CENTRO.y + MEIO_LADO }

/** O caminho da Entrada B até a fachada, pelos corredores (Dijkstra, como as rotas do mapa). */
export function caminhoAteALoja13(): Ponto2D[] {
  const rota = menorCaminho(GRAFO, ENTRADA_DA_TRILHA, PONTO_DO_ATRIO)
  if (!rota) return []
  return [...rota.pontos.map(({ x, y }) => ({ x, y })), FACHADA_DA_LOJA_13]
}

/** Um número entre -1 e 1 que só depende de n: a trilha sai igual em toda tela e todo teste. */
const tremido = (n: number) => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453
  return (s - Math.floor(s)) * 2 - 1
}

/**
 * A trilha de rachaduras: o caminho quebrado em pedaços de ~3 m, cada ponto deslocado para os
 * lados até `desvio` metros (as pontas ficam no lugar), e galhos curtos saindo de alguns pontos.
 */
export function trilhaDeRachaduras(caminho = caminhoAteALoja13(), { passo = 3, desvio = 1.2 } = {}) {
  const tronco: Ponto2D[] = []
  const galhos: Ponto2D[][] = []
  let n = 0
  for (let i = 1; i < caminho.length; i++) {
    const a = caminho[i - 1]
    const b = caminho[i]
    const tamanho = Math.hypot(b.x - a.x, b.y - a.y)
    if (!tamanho) continue
    // A normal do trecho, para deslocar os pontos para os lados.
    const nx = -(b.y - a.y) / tamanho
    const ny = (b.x - a.x) / tamanho
    const pedacos = Math.max(1, Math.round(tamanho / passo))
    for (let k = i === 1 ? 0 : 1; k <= pedacos; k++) {
      const t = k / pedacos
      const ponta = (i === 1 && k === 0) || (i === caminho.length - 1 && k === pedacos)
      const lado = ponta ? 0 : tremido(n++) * desvio
      const ponto = { x: a.x + (b.x - a.x) * t + nx * lado, y: a.y + (b.y - a.y) * t + ny * lado }
      tronco.push(ponto)
      // Um galho a cada 4 pontos, para o lado em que o ponto já desviou.
      if (!ponta && n % 4 === 0) {
        const sentido = lado >= 0 ? 1 : -1
        const comprimento = 1.5 + Math.abs(tremido(n + 100)) * 2
        galhos.push([
          ponto,
          {
            x: ponto.x + (nx * sentido + ((b.x - a.x) / tamanho) * 0.6) * comprimento,
            y: ponto.y + (ny * sentido + ((b.y - a.y) / tamanho) * 0.6) * comprimento,
          },
        ])
      }
    }
  }
  return { tronco, galhos }
}
