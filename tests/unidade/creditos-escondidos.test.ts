// Easter egg do código-fonte: os créditos da equipe e dos orientadores num comentário do
// index.html, que não aparece na tela.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
const comentarios = [...html.matchAll(/<!--([\s\S]*?)-->/g)].map((achado) => achado[1])
const creditos = comentarios.find((comentario) => comentario.includes('TYRANITAR'))

describe('créditos escondidos no index.html', () => {
  it('um comentário com a equipe e os orientadores', () => {
    expect(creditos).toBeDefined()
    for (const nome of ['Gustavo Barbosa Lima', 'Gustavo Ferreira', 'Kauã', 'Diogo', 'Haroldo Soares', 'Paulo Rafael']) {
      expect(creditos).toContain(nome)
    }
  })

  it('fica escondido: fora de qualquer texto que a página mostra', () => {
    const semComentarios = html.replace(/<!--[\s\S]*?-->/g, '')
    expect(semComentarios).not.toContain('Haroldo Soares')
    expect(semComentarios).not.toContain('Paulo Rafael')
  })
})
