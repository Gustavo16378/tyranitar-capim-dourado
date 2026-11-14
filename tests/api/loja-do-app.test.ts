// A página da loja no app (TA44): GET /api/lojas/{id}, pública, com o que a tela mostra (nome,
// piso, categorias e o mapaId do "Como chegar"). Os produtos dela vêm de GET /api/produtos?loja=.
import { describe, expect, it } from 'vitest'
import { onRequestGet as loja } from '../../functions/api/lojas/[id]'
import { onRequestGet as produtos } from '../../functions/api/produtos/index'
import { ANA, chamar } from '../workers/rotas'

const ler = (id: string, usuario = ANA) => chamar(loja, { url: `/api/lojas/${id}`, params: { id }, usuario })

describe('GET /api/lojas/{id}', () => {
  it('TA44: a loja ativa no formato da lista, também sem login', async () => {
    const r = await ler('loja-a')
    expect(r.status).toBe(200)
    expect(r.corpo).toEqual({
      id: 'loja-a',
      nome: 'Loja A',
      piso: 1,
      tipo: 'loja',
      categorias: ['calcados', 'roupas'],
      mapaId: 'mapa-loja-a',
    })
    expect((await chamar(loja, { url: '/api/lojas/restaurante-c', params: { id: 'restaurante-c' } })).corpo).toMatchObject({
      piso: 2,
      tipo: 'alimentacao',
    })
  })

  it('unidade vaga ou id que não existe: 404', async () => {
    const vaga = await ler('vaga-47')
    expect(vaga.status).toBe(404)
    expect(vaga.corpo).toMatchObject({ erro: 'NAO_ENCONTRADO' })
    expect((await ler('nao-existe')).status).toBe(404)
  })

  it('os produtos da página saem de GET /api/produtos?loja=, só os ativos dela', async () => {
    const r = await chamar(produtos, { url: '/api/produtos?loja=loja-b&tamanho=50' })
    expect(r.corpo.itens.map((p: { id: string }) => p.id).sort()).toEqual(['p-hidratante', 'p-perfume'])
  })
})
