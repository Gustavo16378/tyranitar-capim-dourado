// A aparência (src/tema/aparencia.ts, TU38): Automático, Claro ou Escuro, salva no aparelho, e o
// escuro do modo tirano por cima. O script do index.html aplica o tema antes da primeira pintura:
// aqui ele roda de verdade e precisa dar o mesmo tema que temaDaPagina, em toda combinação.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { APARENCIAS, CHAVE_DA_APARENCIA, criarAparencia, lerAparencia, temaDaPagina, type Aparencia, type Armazem } from '../../src/tema/aparencia'
import { CHAVE_DO_TIRANO } from '../../src/easter-egg/modoTirano'

function armazemDeTeste(inicial: Record<string, string> = {}): Armazem & { dados: Map<string, string> } {
  const dados = new Map(Object.entries(inicial))
  return { dados, getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => void dados.set(k, v), removeItem: (k) => void dados.delete(k) }
}

/** Roda o script do <head> do index.html com um localStorage, um sessionStorage e um <html> de mentira. */
function temaDoScript(local: Record<string, string>, sessao: Record<string, string>) {
  const html = readFileSync('index.html', 'utf8')
  const script = html.match(/<head>[\s\S]*?<script>([\s\S]*?)<\/script>/)?.[1]
  if (!script) throw new Error('o index.html não tem o script do tema no <head>')
  const atributos: Record<string, string> = {}
  const documento = { documentElement: { setAttribute: (nome: string, valor: string) => void (atributos[nome] = valor) } }
  new Function('localStorage', 'sessionStorage', 'document', script)(armazemDeTeste(local), armazemDeTeste(sessao), documento)
  return atributos['data-theme'] ?? null
}

describe('TU38: a aparência', () => {
  it('três opções; Automático é o padrão e não guarda nada', () => {
    expect(APARENCIAS.map((a) => a.rotulo)).toEqual(['Automático', 'Claro', 'Escuro'])
    const aparelho = armazemDeTeste()
    const aparencia = criarAparencia(aparelho)
    expect(aparencia.estado()).toBe('automatico')
    let avisos = 0
    aparencia.assinar(() => avisos++)

    aparencia.escolher('escuro')
    expect(aparelho.dados.get(CHAVE_DA_APARENCIA)).toBe('escuro')
    // Recarregar (uma aparência nova com o mesmo aparelho) mantém a escolha.
    expect(criarAparencia(aparelho).estado()).toBe('escuro')
    aparencia.escolher('escuro')
    expect(avisos).toBe(1)

    aparencia.escolher('automatico')
    expect(aparelho.dados.has(CHAVE_DA_APARENCIA)).toBe(false)
    expect(lerAparencia(armazemDeTeste({ [CHAVE_DA_APARENCIA]: 'roxo' }))).toBe('automatico')
    expect(lerAparencia(undefined)).toBe('automatico')
  })

  it('o tema da página: o da escolha, nenhum no Automático, e escuro com o tirano', () => {
    expect(temaDaPagina('automatico', false)).toBeNull()
    expect(temaDaPagina('claro', false)).toBe('light')
    expect(temaDaPagina('escuro', false)).toBe('dark')
    for (const a of ['automatico', 'claro', 'escuro'] as const) expect(temaDaPagina(a, true)).toBe('dark')
  })

  it('o script do index.html, antes da primeira pintura, aplica o mesmo tema', () => {
    const escolhas: (Aparencia | 'outra')[] = ['automatico', 'claro', 'escuro', 'outra']
    for (const escolha of escolhas) {
      for (const tirano of [false, true]) {
        const local: Record<string, string> = escolha === 'automatico' ? {} : { [CHAVE_DA_APARENCIA]: escolha }
        const sessao: Record<string, string> = tirano ? { [CHAVE_DO_TIRANO]: JSON.stringify({ ligado: true, nivelVisto: false }) } : {}
        const esperado = temaDaPagina(lerAparencia(armazemDeTeste(local)), tirano)
        expect(temaDoScript(local, sessao), `${escolha}, tirano ${tirano}`).toBe(esperado)
      }
    }
    // Sessão estragada não quebra a página.
    expect(temaDoScript({ [CHAVE_DA_APARENCIA]: 'claro' }, { [CHAVE_DO_TIRANO]: '{estragado' })).toBeNull()
  })
})
