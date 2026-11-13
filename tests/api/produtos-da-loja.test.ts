// Catálogo da loja no painel (RF21, RF22): GET, POST e PUT /api/loja/produtos e a importação
// por CSV (TU27, TU28, TA29). Cada lojista só vê e mexe nos produtos da própria loja.
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { onRequestPut as editar } from '../../functions/api/loja/produtos/[id]'
import { onRequestPost as importar } from '../../functions/api/loja/produtos/importar'
import { onRequestGet as listar, onRequestPost as criar } from '../../functions/api/loja/produtos/index'
import { fotoValida, lerCsv, lerPreco } from '../../functions/_lib/loja/produtos'
import { ANA, chamar, LOJISTA_A, LOJISTA_B } from '../workers/rotas'

const NOVO = {
  nome: 'Tênis Trilha 3',
  descricao: 'Solado para terra',
  categoria: 'calcados',
  precoCentavos: 45990,
  estoque: 4,
  fotos: ['/produtos/tenis-de-corrida.webp', 'https://exemplo.com/trilha.webp'],
  atributos: { numeracao: [40, 41, 42], cor: 'marrom' },
  ativo: true,
}

const categoriasDaLoja = async (id: string) =>
  JSON.parse((await env.DB.prepare('SELECT categorias FROM loja WHERE id = ?1').bind(id).first<{ categorias: string }>())!.categorias)

const csv = (conteudo: string) =>
  chamar(importar, { metodo: 'POST', url: '/api/loja/produtos/importar', texto: { conteudo, tipo: 'text/csv' }, usuario: LOJISTA_A })

describe('GET /api/loja/produtos', () => {
  it('só os produtos da loja do token, ativos primeiro e em ordem alfabética', async () => {
    await env.DB.prepare(`UPDATE produto SET ativo = 0 WHERE id = 'p-camiseta'`).run()
    const r = await chamar(listar, { url: '/api/loja/produtos', usuario: LOJISTA_A })
    expect(r.status).toBe(200)
    const nomes = r.corpo.itens.map((p: { nome: string }) => p.nome)
    expect(nomes.at(-1)).toBe('Camiseta dry-fit')
    expect(nomes.slice(0, -1)).toEqual([...nomes.slice(0, -1)].sort((a, b) => a.localeCompare(b, 'pt-BR')))
    expect(r.corpo.total).toBe(nomes.length)
    const pulse = r.corpo.itens.find((p: { id: string }) => p.id === 'p-pulse')
    expect(pulse).toMatchObject({ categoria: 'calcados', precoCentavos: 39990, fotos: [], ativo: true })
    expect(pulse.atributos.numeracao).toEqual([40, 41, 42, 43])
    const daB = await chamar(listar, { url: '/api/loja/produtos', usuario: LOJISTA_B })
    expect(daB.corpo.itens.map((p: { id: string }) => p.id)).not.toContain('p-pulse')
  })

  it('q acha o nome sem diferenciar acento, com paginação', async () => {
    const r = await chamar(listar, { url: '/api/loja/produtos?q=tenis&tamanho=1', usuario: LOJISTA_A })
    expect(r.corpo.total).toBe(2)
    expect(r.corpo.itens).toHaveLength(1)
  })

  it('cliente não entra no painel: 403', async () => {
    const r = await chamar(listar, { url: '/api/loja/produtos', usuario: ANA })
    expect(r.status).toBe(403)
  })
})

describe('POST e PUT /api/loja/produtos', () => {
  it('cria com fotos do próprio site e de https://, e a categoria nova vale para a ficha (RN04)', async () => {
    const r = await chamar(criar, { metodo: 'POST', url: '/api/loja/produtos', corpo: { ...NOVO, categoria: 'esportes' }, usuario: LOJISTA_A })
    expect(r.status).toBe(201)
    expect(r.corpo).toMatchObject({ ...NOVO, categoria: 'esportes' })
    expect(typeof r.corpo.id).toBe('string')
    const linha = await env.DB.prepare('SELECT loja_id FROM produto WHERE id = ?1').bind(r.corpo.id).first<{ loja_id: string }>()
    expect(linha?.loja_id).toBe('loja-a')
    expect(await categoriasDaLoja('loja-a')).toEqual(['calcados', 'roupas', 'esportes'])
  })

  it('a categoria que a loja já tem não se repete', async () => {
    await chamar(criar, { metodo: 'POST', url: '/api/loja/produtos', corpo: NOVO, usuario: LOJISTA_A })
    expect(await categoriasDaLoja('loja-a')).toEqual(['calcados', 'roupas'])
  })

  it('TB12: recusa nome curto, preço zero, estoque negativo, categoria desconhecida e foto de outro esquema', async () => {
    const casos = [
      { nome: 'X' },
      { precoCentavos: 0 },
      { estoque: -1 },
      { categoria: 'carros' },
      { fotos: ['javascript:alert(1)'] },
      { fotos: ['//outro-site.com/foto.webp'] },
      { fotos: ['http://exemplo.com/foto.webp'] },
      { atributos: ['cor', 'preto'] },
    ]
    for (const caso of casos) {
      const r = await chamar(criar, { metodo: 'POST', url: '/api/loja/produtos', corpo: { ...NOVO, ...caso }, usuario: LOJISTA_A })
      expect(r.status, JSON.stringify(caso)).toBe(400)
      expect(r.corpo.erro).toBe('DADOS_INVALIDOS')
    }
  })

  it('edita o produto da loja, inclusive desativar e trocar a foto', async () => {
    const r = await chamar(editar, {
      metodo: 'PUT',
      url: '/api/loja/produtos/p-pulse',
      params: { id: 'p-pulse' },
      corpo: { ...NOVO, nome: 'Tênis de corrida Pulse', fotos: ['/produtos/tenis-de-corrida.webp'], ativo: false },
      usuario: LOJISTA_A,
    })
    expect(r.status).toBe(200)
    expect(r.corpo).toMatchObject({ id: 'p-pulse', fotos: ['/produtos/tenis-de-corrida.webp'], ativo: false, estoque: 4 })
  })

  it('produto de outra loja é 404 e não muda', async () => {
    const r = await chamar(editar, {
      metodo: 'PUT',
      url: '/api/loja/produtos/p-pulse',
      params: { id: 'p-pulse' },
      corpo: NOVO,
      usuario: LOJISTA_B,
    })
    expect(r.status).toBe(404)
    const nome = await env.DB.prepare(`SELECT nome FROM produto WHERE id = 'p-pulse'`).first<{ nome: string }>()
    expect(nome?.nome).toBe('Tênis de corrida Pulse')
  })
})

describe('POST /api/loja/produtos/importar', () => {
  it('TA29 e TU28: salva as linhas boas e lista as ruins com o número da linha', async () => {
    const r = await csv(
      [
        'nome,descricao,categoria,preco,estoque,fotos,atributos',
        'Chuteira Gol,Para grama,calcados,"299,90",3,/produtos/tenis-de-corrida.webp,"{""cor"":""branco""}"',
        'Boné Sol,,acessorios,abc,1,,',
        'Meia esportiva,,roupas,19.9,8,,{cor:preto}',
        'Camiseta dry-fit,Nova cor,roupas,89,12,https://exemplo.com/a.webp|https://exemplo.com/b.webp,',
      ].join('\r\n'),
    )
    expect(r.status).toBe(200)
    expect(r.corpo).toEqual({
      importados: 2,
      erros: [
        { linha: 3, mensagem: 'O preço precisa estar em reais, como 399,90.' },
        { linha: 4, mensagem: 'Os atributos precisam estar em JSON, como {"cor":"preto"}.' },
      ],
    })
    const chuteira = await env.DB.prepare(`SELECT preco_centavos, fotos, atributos FROM produto WHERE nome = 'Chuteira Gol'`).first()
    expect(chuteira).toEqual({ preco_centavos: 29990, fotos: '["/produtos/tenis-de-corrida.webp"]', atributos: '{"cor":"branco"}' })
    // O nome que já está no catálogo atualiza o produto, em vez de duplicar.
    const camisetas = await env.DB.prepare(`SELECT id, estoque, preco_centavos FROM produto WHERE nome = 'Camiseta dry-fit'`).all()
    expect(camisetas.results).toEqual([{ id: 'p-camiseta', estoque: 12, preco_centavos: 8900 }])
  })

  it('falta coluna: 400 e nada é salvo', async () => {
    const r = await csv('nome,preco\nBoné,10')
    expect(r.status).toBe(400)
    expect(r.corpo.mensagem).toContain('Faltou: descricao, categoria, estoque, fotos, atributos')
  })
})

describe('regras do catálogo', () => {
  it('lerCsv entende aspas, aspas dobradas e quebra de linha do Windows', () => {
    expect(lerCsv('a,b\r\n"1,5","diz ""oi"""\n\n')).toEqual([
      ['a', 'b'],
      ['1,5', 'diz "oi"'],
    ])
  })

  it('TU27: preço do CSV em reais', () => {
    expect(lerPreco('399,90')).toBe(39990)
    expect(lerPreco('399.90')).toBe(39990)
    expect(lerPreco('399')).toBe(39900)
    expect(lerPreco('R$ 1.299,90')).toBe(129990)
    expect(lerPreco('dez')).toBeNull()
  })

  it('foto: https:// ou caminho do site', () => {
    expect(fotoValida('/produtos/perfume-100-ml.webp')).toBe(true)
    expect(fotoValida('https://images.exemplo.com/p.webp')).toBe(true)
    expect(fotoValida('http://exemplo.com/p.webp')).toBe(false)
    expect(fotoValida('//exemplo.com/p.webp')).toBe(false)
    expect(fotoValida('data:image/png;base64,AAAA')).toBe(false)
    expect(fotoValida('/com espaço.webp')).toBe(false)
  })
})
