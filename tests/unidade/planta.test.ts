import { describe, expect, it } from 'vitest'
import { distancia, rotaAte } from '../../src/mapa/planta'

describe('planta ilustrativa', () => {
  it('rota da entrada até a loja, com distância e tempo a pé', () => {
    const rota = rotaAte('loja-esportes')
    expect(rota?.[0]).toEqual([135, 250])
    expect(distancia(rota!)).toEqual({ metros: 120, minutos: 2 })
  })

  it('loja sem rota no térreo não inventa caminho', () => {
    expect(rotaAte('loja-cinema')).toBeUndefined()
    expect(rotaAte('loja-209')).toBeUndefined()
  })
})
