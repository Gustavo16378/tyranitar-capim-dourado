// Contraste dos tokens de cor (WCAG 2.1), nos dois temas.
// Os pares de texto saem das notas do tokens.json ("Texto ... sobre `surface` e `ouro-soft`"),
// então um token novo com nota de texto já entra no teste.
import { describe, expect, it } from 'vitest'
import tokens from '../../src/design-system/tokens.json'

type Tema = 'light' | 'dark'
const TEMAS: Tema[] = ['light', 'dark']
const NOME_DO_TEMA = Object.fromEntries(tokens.color.themes.map((t) => [t.id, t.name]))
const cores = new Map(tokens.color.tokens.map((t) => [t.name, t]))

function valor(nome: string, tema: Tema): string {
  const token = cores.get(nome)
  if (!token) throw new Error(`O token ${nome} não existe`)
  const v = token.value
  if (typeof v === 'string') {
    const ref = v.match(/^\{(.+)\}$/)
    return ref ? valor(ref[1], tema) : v
  }
  return v[tema]
}

function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a: string, b: string) {
  const [clara, escura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (clara + 0.05) / (escura + 0.05)
}

/** Pares de texto das notas: tokens cuja nota fala de texto e cita os fundos depois de "sobre". */
function paresDeTexto(): [string, string][] {
  const pares = new Map<string, [string, string]>()
  for (const token of tokens.color.tokens) {
    if (!/texto/i.test(token.usage)) continue
    const inicio = token.usage.indexOf('sobre')
    if (inicio < 0) continue
    const fim = token.usage.indexOf('.', inicio)
    const trecho = token.usage.slice(inicio, fim < 0 ? undefined : fim)
    for (const [, fundo] of trecho.matchAll(/`([a-z-]+)`/g)) {
      // O contraste é simétrico: terra com on-terra é o mesmo par que on-terra com terra.
      pares.set([token.name, fundo].sort().join('|'), [token.name, fundo])
    }
  }
  return [...pares.values()]
}

const TEXTO = paresDeTexto()

// Elementos que não são texto pedem 3:1 (WCAG 1.4.11), como dizem as notas desses tokens.
const NAO_TEXTO: [string, string][] = [
  ['line-strong', 'surface-raised'],
  ['focus-ring', 'surface'],
  ['focus-ring', 'surface-raised'],
  ['focus-ring', 'surface-sunken'],
]

const casos = (pares: [string, string][], minimo: number) =>
  TEMAS.flatMap((tema) =>
    pares.map(([frente, fundo]) => ({ frente, fundo, tema, nomeTema: NOME_DO_TEMA[tema], minimo })),
  )

describe('contraste dos tokens', () => {
  it('acha os pares de texto nas notas', () => {
    expect(TEXTO.length).toBeGreaterThanOrEqual(20)
    expect(TEXTO).toContainEqual(['ink', 'surface'])
    expect(TEXTO).toContainEqual(['on-marrom', 'marrom'])
  })

  it('todo token de texto (ink, *-ink, on-*) tem pelo menos um par testado', () => {
    const testados = new Set(TEXTO.flat())
    const deTexto = tokens.color.tokens
      .map((t) => t.name)
      .filter((n) => n === 'ink' || n === 'ink-muted' || n.endsWith('-ink') || n.startsWith('on-'))
    expect(deTexto.filter((n) => !testados.has(n))).toEqual([])
  })

  it.each(casos(TEXTO, 4.5))('texto $frente sobre $fundo, tema $nomeTema: pelo menos 4,5:1', (c) => {
    const razao = contraste(valor(c.frente, c.tema), valor(c.fundo, c.tema))
    expect(razao, `${razao.toFixed(2)}:1`).toBeGreaterThanOrEqual(c.minimo)
  })

  it.each(casos(NAO_TEXTO, 3))('$frente sobre $fundo, tema $nomeTema: pelo menos 3:1', (c) => {
    const razao = contraste(valor(c.frente, c.tema), valor(c.fundo, c.tema))
    expect(razao, `${razao.toFixed(2)}:1`).toBeGreaterThanOrEqual(c.minimo)
  })
})
