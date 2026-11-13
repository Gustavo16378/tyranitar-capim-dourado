// Plantas e rotas do mapa (RF10): leitura dos SVGs e menor caminho por Dijkstra.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { chegadaDaLoja, menorCaminho, minutosAPe, montarGrafo, rotaAteALoja, type DadosDeRotas } from '../../src/mapa/grafo'
import { lerLojas, lerViewBox } from '../../src/mapa/svg'

const ler = (nome: string) => readFileSync(new URL(`../../src/mapa/${nome}`, import.meta.url), 'utf8')
const piso1 = ler('piso-1.svg')
const piso2 = ler('piso-2.svg')
const grafo = montarGrafo(JSON.parse(ler('rotas.json')) as DadosDeRotas)

describe('plantas', () => {
  it('lê o tamanho de cada piso, em metros', () => {
    expect(lerViewBox(piso1)).toEqual({ x: 174.13, y: 67.5, largura: 369.56, altura: 278.86 })
    expect(lerViewBox(piso2).largura).toBeCloseTo(63.97)
  })

  it('lê os polígonos das lojas, com o centro dentro da loja', () => {
    const lojas = lerLojas(piso1)
    expect(lojas).toHaveLength(139)
    expect(lerLojas(piso2)).toHaveLength(16)
    const loja07 = lojas.find((l) => l.mapaId === 'loja-07')!
    const xs = loja07.pontos.map((p) => p.x)
    expect(loja07.centro.x).toBeGreaterThan(Math.min(...xs))
    expect(loja07.centro.x).toBeLessThan(Math.max(...xs))
  })
})

describe('menor caminho (Dijkstra)', () => {
  const pequeno = montarGrafo({
    pontos: [
      { id: 'a', x: 0, y: 0, piso: 1, tipo: 'entrada' },
      { id: 'b', x: 10, y: 0, piso: 1, tipo: 'corredor' },
      { id: 'c', x: 10, y: 10, piso: 1, tipo: 'corredor' },
      { id: 'd', x: 0, y: 30, piso: 1, tipo: 'porta', loja: 'loja-x' },
    ],
    caminhos: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['a', 'd']],
  })

  it('escolhe o caminho mais curto, não o com menos trechos', () => {
    // a→d direto: 30 m. a→b→c→d: 10 + 10 + ~22,4 = ~42,4 m.
    expect(menorCaminho(pequeno, 'a', 'd')?.pontos.map((p) => p.id)).toEqual(['a', 'd'])
    expect(menorCaminho(pequeno, 'a', 'c')).toMatchObject({ metros: 20 })
    expect(menorCaminho(pequeno, 'a', 'nao-existe')).toBeNull()
  })

  it('no shopping: sai de uma entrada e chega à porta da loja, por trechos que existem', () => {
    const rota = rotaAteALoja(grafo, 'loja-07', 1)!
    expect(rota.pontos[0].tipo).toBe('entrada')
    expect(rota.pontos.at(-1)).toMatchObject({ tipo: 'porta', loja: 'loja-07' })
    for (let i = 1; i < rota.pontos.length; i++) {
      expect(grafo.vizinhos.get(rota.pontos[i - 1].id)!.some((v) => v.id === rota.pontos[i].id)).toBe(true)
    }
    expect(rota.metros).toBeGreaterThan(0)
  })

  it('loja do 2º piso: a rota fica no 2º piso; loja âncora sem porta: chega ao corredor mais perto', () => {
    const centro = lerLojas(piso2).find((l) => l.mapaId === 'loja-200')!.centro
    const rota2 = rotaAteALoja(grafo, 'loja-200', 2, centro)!
    expect(rota2.pontos.every((p) => p.piso === 2)).toBe(true)
    const ancora = lerLojas(piso1).find((l) => l.mapaId === 'loja-pc01a')!
    const chegada = chegadaDaLoja(grafo, 'loja-pc01a', 1, ancora.centro)!
    expect(chegada).toMatchObject({ piso: 1 })
    expect(chegada.tipo).not.toBe('porta')
    expect(rotaAteALoja(grafo, 'loja-pc01a', 1, ancora.centro)).not.toBeNull()
    expect(rotaAteALoja(grafo, 'loja-inexistente', 1)).toBeNull()
  })

  it('minutos a pé, a 1,2 m/s, com no mínimo 1', () => {
    expect(minutosAPe(10)).toBe(1)
    expect(minutosAPe(140)).toBe(2)
    expect(minutosAPe(300)).toBe(4)
  })
})
