import { beforeEach, describe, expect, it } from 'vitest'
import { criarTokenFalso } from '../../src/mocks/comum/token'
import { reiniciarMocks, responderMock } from '../../src/mocks/loja'
import { lerCsv } from '../../src/mocks/loja/produtos'
import {
  atributosParaTexto,
  CATEGORIAS,
  resumoDosAtributos,
  textoParaAtributos,
} from '../../src/loja/telas/produtos/categorias'
import type { Lista, ProdutoDaLoja, ResultadoImportacao } from '../../src/tipos/loja'

let token: string | null = null

async function chamar<T = unknown>(metodo: string, url: string, corpo?: unknown, tipo?: string) {
  const resposta = await responderMock({
    metodo,
    url,
    corpo: corpo === undefined ? undefined : typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
    tipo,
    token,
  })
  if (!resposta) throw new Error(`${metodo} ${url} não está mockada`)
  return { status: resposta.status, corpo: (await resposta.json()) as T }
}

beforeEach(async () => {
  reiniciarMocks()
  token = null
  // O token do login real (o mock só lê o perfil e o exp).
  token = criarTokenFalso({ sub: 'l-pc01a', perfil: 'LOJISTA', lojaId: 'loja-pc01a' })
})

const NOVO = {
  nome: 'Viseira de corrida',
  descricao: '',
  categoria: 'acessorios',
  precoCentavos: 6990,
  estoque: 4,
  fotos: [],
  atributos: { cor: 'preta' },
  ativo: true,
}

describe('mocks: produtos da loja', () => {
  it('lista o catálogo com inativos no fim e busca sem ligar para acento', async () => {
    const todos = await chamar<Lista<ProdutoDaLoja>>('GET', '/api/loja/produtos')
    expect(todos.corpo.total).toBe(9)
    expect(todos.corpo.itens.at(-1)).toMatchObject({ nome: 'Jaqueta corta-vento', ativo: false })

    const busca = await chamar<Lista<ProdutoDaLoja>>('GET', '/api/loja/produtos?q=tenis')
    expect(busca.corpo.itens.map((p) => p.nome)).toEqual(['Tênis de corrida Pulse', 'Tênis Run 2 preto'])
  })

  it('cria, edita e recusa produto inválido com 400', async () => {
    const criado = await chamar<ProdutoDaLoja>('POST', '/api/loja/produtos', NOVO)
    expect(criado.status).toBe(201)
    expect(criado.corpo).toMatchObject({ id: expect.any(String), ...NOVO })

    const editado = await chamar<ProdutoDaLoja>('PUT', `/api/loja/produtos/${criado.corpo.id}`, { ...NOVO, estoque: 0 })
    expect(editado.corpo.estoque).toBe(0)

    const semPreco = await chamar('POST', '/api/loja/produtos', { ...NOVO, precoCentavos: 0 })
    expect(semPreco.corpo).toMatchObject({ status: 400, erro: 'DADOS_INVALIDOS' })
    const outraCategoria = await chamar('POST', '/api/loja/produtos', { ...NOVO, categoria: 'pet' })
    expect(outraCategoria.status).toBe(400)
    const naoExiste = await chamar('PUT', '/api/loja/produtos/p-nao-existe', NOVO)
    expect(naoExiste.status).toBe(404)
  })

  it('importa a planilha, salva só as linhas certas e atualiza produto com o mesmo nome', async () => {
    const csv = [
      'nome,descricao,categoria,preco,estoque,fotos,atributos',
      'Viseira de corrida,Leve,acessorios,"69,90",4,,"{""cor"":""preta""}"',
      'Tênis de corrida Pulse,,calcados,379.90,5,,',
      'Sem preço,,roupas,,2,,',
      'Atributo quebrado,,roupas,10,2,,{cor:azul}',
    ].join('\r\n')
    const { status, corpo } = await chamar<ResultadoImportacao>('POST', '/api/loja/produtos/importar', csv, 'text/csv')
    expect(status).toBe(200)
    expect(corpo.importados).toBe(2)
    expect(corpo.erros).toEqual([
      { linha: 4, mensagem: expect.stringMatching(/preço/) },
      { linha: 5, mensagem: expect.stringMatching(/JSON/) },
    ])
    const lista = await chamar<Lista<ProdutoDaLoja>>('GET', '/api/loja/produtos?tamanho=100')
    expect(lista.corpo.total).toBe(10)
    expect(lista.corpo.itens.find((p) => p.nome === 'Tênis de corrida Pulse')?.precoCentavos).toBe(37990)
  })

  it('pede as colunas do modelo', async () => {
    const { status, corpo } = await chamar('POST', '/api/loja/produtos/importar', 'nome,preco\nBoné,10', 'text/csv')
    expect(status).toBe(400)
    expect(corpo).toMatchObject({ erro: 'DADOS_INVALIDOS', mensagem: expect.stringMatching(/Faltou/) })
  })
})

describe('lerCsv', () => {
  it('entende aspas, aspas dobradas e quebra de linha do Windows', () => {
    expect(lerCsv('a,b\r\n"1,5","diz ""oi"""\n\n')).toEqual([
      ['a', 'b'],
      ['1,5', 'diz "oi"'],
    ])
  })
})

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
