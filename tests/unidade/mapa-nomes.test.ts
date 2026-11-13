import { describe, expect, it } from 'vitest'
import { areaDoPoligono, lojasGrandes, numeroDaLoja, rotuloDaLoja } from '../../src/mapa/nomesNaPlanta'

describe('rótulos das lojas no mapa', () => {
  it('número da loja a partir do id da planta', () => {
    expect(numeroDaLoja('loja-209')).toBe('209')
    expect(numeroDaLoja('loja-05-a')).toBe('05 A')
    expect(numeroDaLoja('loja-pc-04')).toBe('PC 04')
    expect(numeroDaLoja('loja-pc01a')).toBe('PC01A')
    expect(numeroDaLoja('loja-ancora-04')).toBe('Âncora 04')
    expect(numeroDaLoja('loja-anc-a9')).toBe('Âncora A9')
  })

  it('nome da loja ativa; número, e a palavra vaga, para as outras', () => {
    const nomes = { 'loja-07': 'Loja A' }
    expect(rotuloDaLoja('loja-07', nomes)).toBe('Loja A')
    expect(rotuloDaLoja('loja-209', nomes)).toBe('Loja 209 · vaga')
    expect(rotuloDaLoja('loja-ancora-04', nomes)).toBe('Âncora 04 · vaga')
    // Sem a lista de ativas (carregando), não dá para dizer que está vaga.
    expect(rotuloDaLoja('loja-209')).toBe('Loja 209')
  })

  it('lojas grandes: 1/4 da área da maior do piso ou mais', () => {
    const quadrado = (lado: number) => [
      { x: 0, y: 0 },
      { x: lado, y: 0 },
      { x: lado, y: lado },
      { x: 0, y: lado },
    ]
    expect(areaDoPoligono(quadrado(10))).toBe(100)
    const grandes = lojasGrandes([
      { mapaId: 'a', pontos: quadrado(20) },
      { mapaId: 'b', pontos: quadrado(10) },
      { mapaId: 'c', pontos: quadrado(9) },
    ])
    expect([...grandes]).toEqual(['a', 'b'])
  })
})
