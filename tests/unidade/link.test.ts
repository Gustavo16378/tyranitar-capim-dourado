import { describe, expect, it } from 'vitest'
import { linkValido, separarLink, termosDoLink } from '../../src/api/link'
import { tamanhoDoBase64 } from '../../src/api/limites'

describe('links na conversa', () => {
  it('separa o link do resto da mensagem, sem a pontuação colada', () => {
    expect(separarLink('tem esse? https://loja.com/tenis-x?cor=preto.')).toEqual({
      texto: 'tem esse?',
      link: 'https://loja.com/tenis-x?cor=preto',
    })
    expect(separarLink('  só texto  ')).toEqual({ texto: 'só texto' })
  })

  it('só aceita http e https', () => {
    expect(linkValido('https://loja.com/a')).toBe(true)
    expect(linkValido('http://loja.com')).toBe(true)
    expect(linkValido('ftp://loja.com/a')).toBe(false)
    expect(linkValido('loja.com/a')).toBe(false)
  })

  it('palavras de busca a partir do endereço do produto', () => {
    expect(termosDoLink('https://www.loja.com.br/tenis-de-corrida-pulse-preto-42/p')).toBe('tenis corrida pulse preto')
    expect(termosDoLink('https://loja.com/produto/perfume%C3%A1-100ml.html')).toBe('perfumeá')
    expect(termosDoLink('não é link')).toBe('')
  })

  it('tamanho do base64 em bytes', () => {
    expect(tamanhoDoBase64('AAAA')).toBe(3)
    expect(tamanhoDoBase64('AAA=')).toBe(2)
    expect(tamanhoDoBase64('AA==')).toBe(1)
  })
})
