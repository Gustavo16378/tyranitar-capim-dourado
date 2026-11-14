// Partes puras da Capi: entrada do chat (TI06), página do link (TI07), confirmação e ficha.
import { describe, expect, it } from 'vitest'
import { IMAGEM_MAXIMA_BYTES, lerEntradaDoChat, tamanhoDoBase64 } from '../../functions/_lib/capi/entrada'
import { extrairDadosDaPagina } from '../../functions/_lib/capi/pagina'
import { juntarInteresses } from '../../functions/_lib/regras/ficha'

/** Base64 que decodifica para exatamente n bytes. */
const base64DeBytes = (n: number) => 'AAAA'.repeat(Math.floor(n / 3)) + ['', 'AA==', 'AAA='][n % 3]

describe('entrada do chat', () => {
  it('aceita texto, foto em base64 (também como data URL) e link', () => {
    expect(lerEntradaDoChat({ texto: '  Tem tênis?  ' })).toEqual({ texto: 'Tem tênis?' })
    expect(lerEntradaDoChat({ imagem: { tipo: 'image/png', base64: 'iVBORw0KGgo=' } })).toEqual({
      texto: '',
      imagem: { tipo: 'image/png', base64: 'iVBORw0KGgo=' },
    })
    expect(lerEntradaDoChat({ imagem: { base64: 'data:image/jpeg;base64,/9j/4AAQ' } }).imagem).toEqual({
      tipo: 'image/jpeg',
      base64: '/9j/4AAQ',
    })
    expect(lerEntradaDoChat({ texto: 'Acha esse?', link: 'https://loja.example/produto/1' }).link).toBe(
      'https://loja.example/produto/1',
    )
  })

  it('TI06: foto acima de 4 MB é DADOS_INVALIDOS (400)', () => {
    expect(tamanhoDoBase64(base64DeBytes(IMAGEM_MAXIMA_BYTES))).toBe(IMAGEM_MAXIMA_BYTES)
    expect(tamanhoDoBase64(base64DeBytes(10))).toBe(10)
    expect(() => lerEntradaDoChat({ imagem: { tipo: 'image/jpeg', base64: base64DeBytes(IMAGEM_MAXIMA_BYTES) } })).not.toThrow()
    expect(() => lerEntradaDoChat({ imagem: { tipo: 'image/jpeg', base64: base64DeBytes(IMAGEM_MAXIMA_BYTES + 1) } })).toThrow(
      expect.objectContaining({ codigo: 'DADOS_INVALIDOS', status: 400 }),
    )
  })

  it('recusa mensagem vazia, texto longo, foto junto com link, tipo de arquivo e link fora do http', () => {
    const casos = [
      {},
      { texto: '   ' },
      { texto: 'x'.repeat(1001) },
      { texto: 'oi', imagem: { tipo: 'image/png', base64: 'AAAA' }, link: 'https://a.example' },
      { imagem: { tipo: 'application/pdf', base64: 'AAAA' } },
      { imagem: { tipo: 'image/png', base64: 'não é base64!' } },
      { link: 'javascript:alert(1)' },
      { link: 'ftp://arquivos.example/x' },
    ]
    for (const corpo of casos) {
      expect(() => lerEntradaDoChat(corpo), JSON.stringify(corpo).slice(0, 80)).toThrow(
        expect.objectContaining({ codigo: 'DADOS_INVALIDOS' }),
      )
    }
  })
})

describe('página do link (TI07)', () => {
  it('lê og:title, og:image (endereço completo) e o preço das tags Open Graph', () => {
    const html = `<html><head><title>Ignorado</title>
      <meta property="og:title" content="Tênis Pulse Preto &amp; Branco">
      <meta content="/img/pulse.jpg" property="og:image">
      <meta property="product:price:amount" content="399.90">
      <meta property="product:price:currency" content="BRL">
      <meta name="description" content="Tênis de corrida">
    </head></html>`
    expect(extrairDadosDaPagina(html, 'https://loja.example/p/pulse')).toEqual({
      url: 'https://loja.example/p/pulse',
      titulo: 'Tênis Pulse Preto & Branco',
      imagem: 'https://loja.example/img/pulse.jpg',
      preco: '399.90',
      moeda: 'BRL',
      descricao: 'Tênis de corrida',
    })
  })

  it('sem Open Graph, usa o JSON-LD de Product e o <title>', () => {
    const html = `<title>Loja X</title>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Jaqueta corta-vento",
      "image":["https://cdn.example/jaqueta.webp"],"offers":{"@type":"Offer","price":189.9,"priceCurrency":"BRL"}}</script>`
    expect(extrairDadosDaPagina(html, 'https://loja.example/j')).toMatchObject({
      titulo: 'Jaqueta corta-vento',
      imagem: 'https://cdn.example/jaqueta.webp',
      preco: '189.9',
      moeda: 'BRL',
    })
    expect(extrairDadosDaPagina('<title>Só o título</title>', 'https://a.example').titulo).toBe('Só o título')
  })
})

describe('ficha atualizada pela Capi', () => {
  it('junta sem repetir a mesma frase e fica com as mais recentes', () => {
    const atuais = [
      { categoria: 'calcados', detalhe: 'Calça 42' },
      { categoria: 'roupas', detalhe: 'Prefere azul' },
    ]
    expect(juntarInteresses(atuais, [{ categoria: 'Calcados', detalhe: 'calça 42 ' }])).toEqual([
      { categoria: 'roupas', detalhe: 'Prefere azul' },
      { categoria: 'calcados', detalhe: 'calça 42' },
    ])
    const muitos = Array.from({ length: 20 }, (_, i) => ({ categoria: 'roupas', detalhe: `item ${i}` }))
    expect(juntarInteresses([], muitos, 12).map((i) => i.detalhe)).toEqual(muitos.slice(8).map((i) => i.detalhe))
  })
})
