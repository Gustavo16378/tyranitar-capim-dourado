// Planta ilustrativa do protótipo, até chegar a planta oficial em SVG (Fase 6). Os ids seguem o
// mapaId das lojas (o mesmo que a API devolve em produto.loja.mapaId).
import type { Piso } from '../tipos'

export interface BlocoPlanta {
  id: string
  nome: string
  x: number
  y: number
  largura: number
  altura: number
  tipo: 'loja' | 'alimentacao'
}

/** Coordenadas no viewBox 0 0 380 270 do desenho. */
export const PLANTA: Record<Piso, BlocoPlanta[]> = {
  1: [
    { id: 'loja-esportes', nome: 'Loja de esportes', x: 20, y: 20, largura: 90, altura: 60, tipo: 'loja' },
    { id: 'loja-calcados', nome: 'Calçados', x: 120, y: 20, largura: 70, altura: 60, tipo: 'loja' },
    { id: 'loja-perfumaria', nome: 'Perfumaria', x: 200, y: 20, largura: 80, altura: 60, tipo: 'loja' },
    { id: 'loja-eletronicos', nome: 'Eletrônicos', x: 20, y: 150, largura: 110, altura: 70, tipo: 'loja' },
    { id: 'loja-moda', nome: 'Moda masculina', x: 140, y: 150, largura: 70, altura: 70, tipo: 'loja' },
    { id: 'loja-farmacia', nome: 'Farmácia', x: 220, y: 150, largura: 60, altura: 70, tipo: 'loja' },
    { id: 'loja-supermercado', nome: 'Supermercado', x: 290, y: 20, largura: 70, altura: 200, tipo: 'loja' },
  ],
  2: [
    { id: 'loja-restaurante', nome: 'Restaurante', x: 20, y: 20, largura: 80, altura: 60, tipo: 'alimentacao' },
    { id: 'loja-lanches', nome: 'Lanches', x: 110, y: 20, largura: 70, altura: 60, tipo: 'alimentacao' },
    { id: 'loja-cafeteria', nome: 'Cafeteria', x: 190, y: 20, largura: 70, altura: 60, tipo: 'alimentacao' },
    { id: 'mesas', nome: 'Mesas', x: 40, y: 110, largura: 220, altura: 60, tipo: 'alimentacao' },
    { id: 'loja-cinema', nome: 'Cinema', x: 280, y: 20, largura: 80, altura: 200, tipo: 'loja' },
  ],
}

/** A entrada do térreo, de onde sai a rota (fica no corredor entre Eletrônicos e Moda). */
export const ENTRADA = { x: 135, y: 250 }

type Ponto = [x: number, y: number]

/** Até a porta de cada loja do térreo pelo corredor central (y = 115). */
const PORTAS: Record<string, Ponto[]> = {
  'loja-esportes': [
    [65, 115],
    [65, 82],
  ],
  'loja-calcados': [
    [155, 115],
    [155, 82],
  ],
  'loja-perfumaria': [
    [240, 115],
    [240, 82],
  ],
  'loja-eletronicos': [
    [75, 115],
    [75, 148],
  ],
  'loja-moda': [
    [175, 115],
    [175, 148],
  ],
  'loja-farmacia': [
    [250, 115],
    [250, 148],
  ],
  'loja-supermercado': [[288, 115]],
}

/** Uma volta no desenho vale meio metro; a pé, uns 70 m por minuto. */
const METROS_POR_UNIDADE = 0.5
const METROS_POR_MINUTO = 70

export function acharBloco(id: string): { bloco: BlocoPlanta; piso: Piso } | undefined {
  for (const piso of [1, 2] as const) {
    const bloco = PLANTA[piso].find((b) => b.id === id)
    if (bloco) return { bloco, piso }
  }
  return undefined
}

/** Os pontos da rota da entrada até a loja, ou undefined se ela não tem rota no térreo. */
export function rotaAte(id: string): Ponto[] | undefined {
  const porta = PORTAS[id]
  return porta && [[ENTRADA.x, ENTRADA.y], [ENTRADA.x, 115], ...porta]
}

export function caminhoSvg(pontos: Ponto[]) {
  return pontos.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')
}

/** Distância a pé e tempo da rota: { metros: 120, minutos: 2 }. */
export function distancia(pontos: Ponto[]) {
  let unidades = 0
  for (let i = 1; i < pontos.length; i++) {
    unidades += Math.hypot(pontos[i][0] - pontos[i - 1][0], pontos[i][1] - pontos[i - 1][1])
  }
  const metros = Math.round((unidades * METROS_POR_UNIDADE) / 10) * 10
  return { metros, minutos: Math.max(1, Math.round(metros / METROS_POR_MINUTO)) }
}
