import { describe, expect, it } from 'vitest'
import { normalizar, termosDaBusca, textosDoJson } from '../../functions/_lib/texto'

describe('busca por texto', () => {
  it('ignora acento e maiúsculas', () => {
    expect(normalizar('Tênis de Corrida')).toBe('tenis de corrida')
    expect(normalizar('CALÇADOS')).toBe('calcados')
  })

  it('tira palavras vazias e o plural simples', () => {
    expect(termosDaBusca('Tem tênis preto?')).toEqual(['tenis', 'preto'])
    expect(termosDaBusca('jaquetas para chuva')).toEqual(['jaqueta', 'chuva'])
    expect(termosDaBusca('perfumes e calçados')).toEqual(['perfume', 'calcado'])
    expect(termosDaBusca('  ')).toEqual([])
  })

  it('junta os textos dos atributos do produto', () => {
    expect(textosDoJson({ numeracao: [40, 42], cor: 'preto', extra: { tecido: 'dry-fit' } })).toEqual([
      '40',
      '42',
      'preto',
      'dry-fit',
    ])
  })
})
