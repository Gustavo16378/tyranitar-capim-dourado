// Os campos de atributo do formulário de produto do painel. As rotas de produtos são testadas
// contra a API real em tests/api/produtos-da-loja.test.ts.
import { describe, expect, it } from 'vitest'
import {
  atributosParaTexto,
  CATEGORIAS,
  resumoDosAtributos,
  textoParaAtributos,
} from '../../src/loja/telas/produtos/categorias'

describe('atributos por categoria', () => {
  const calcados = CATEGORIAS.find((c) => c.id === 'calcados')!.atributos

  it('converte o que foi digitado para o JSON da API', () => {
    expect(textoParaAtributos(calcados, { numeracao: '38, 39,40', cor: ' preto ' })).toEqual({
      atributos: { numeracao: [38, 39, 40], cor: 'preto' },
    })
    expect(textoParaAtributos(calcados, { numeracao: '', cor: '' })).toEqual({ atributos: {} })
    expect(textoParaAtributos(calcados, { numeracao: '38, grande' })).toMatchObject({ chave: 'numeracao' })
  })

  it('volta para o formulário e resume para a lista', () => {
    expect(atributosParaTexto({ numeracao: [40, 41], cor: 'preto' })).toEqual({ numeracao: '40, 41', cor: 'preto' })
    expect(resumoDosAtributos({ tamanhos: ['P', 'M'], cor: 'verde' })).toBe('P, M · verde')
  })
})
