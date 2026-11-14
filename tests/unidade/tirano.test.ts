// Easter egg do console (src/tirano.ts): o banner TYRANITAR com a dica e tyranitar(), que dispara
// o evento "tyranitar:acordar" de que o modo do tirano no app depende.
import { describe, expect, it } from 'vitest'
import { ACORDOU, BANNER, DICA, EVENTO_ACORDAR, instalarTirano, LEGENDA } from '../../src/tirano'

function instalar() {
  const alvo = new EventTarget() as EventTarget & { tyranitar?: () => string }
  const mostrado: unknown[][] = []
  instalarTirano(alvo, { log: (...partes: unknown[]) => mostrado.push(partes) })
  return { alvo, mostrado }
}

describe('banner do tirano no console', () => {
  it('cinco linhas de ASCII puro, sem sobra de espaço no fim', () => {
    const linhas = BANNER.split('\n')
    expect(linhas).toHaveLength(5)
    for (const linha of linhas) {
      expect(linha).toMatch(/^[\x20-\x7e]+$/)
      expect(linha).toBe(linha.trimEnd())
    }
    // O "T" do começo e o "R" do fim.
    expect(linhas[1].startsWith('|_   _|')).toBe(true)
    expect(linhas[4].endsWith('|_| \\_\\')).toBe(true)
  })

  it('o console mostra o banner, a legenda e a dica numa mensagem só, com estilo', () => {
    const { mostrado } = instalar()
    expect(mostrado).toHaveLength(1)
    const [texto, ...estilos] = mostrado[0] as string[]
    expect(texto).toContain(BANNER)
    expect(texto).toContain(LEGENDA)
    expect(texto).toContain(DICA)
    expect(DICA).toBe('digite tyranitar() para acordar o tirano')
    // Um estilo para cada %c, e nenhum outro % que o console leria como formato.
    expect(texto.match(/%c/g)).toHaveLength(estilos.length)
    expect(texto.replaceAll('%c', '')).not.toContain('%')
  })
})

describe('tyranitar()', () => {
  it('dispara "tyranitar:acordar" no alvo a cada chamada e responde que o tirano acordou', () => {
    const { alvo } = instalar()
    let acordou = 0
    alvo.addEventListener('tyranitar:acordar', () => acordou++)
    expect(EVENTO_ACORDAR).toBe('tyranitar:acordar')
    expect(alvo.tyranitar?.()).toBe(ACORDOU)
    expect(alvo.tyranitar?.()).toBe(ACORDOU)
    expect(acordou).toBe(2)
  })

  it('sem chamar, nada acorda', () => {
    const { alvo } = instalar()
    let acordou = false
    alvo.addEventListener(EVENTO_ACORDAR, () => (acordou = true))
    expect(typeof alvo.tyranitar).toBe('function')
    expect(acordou).toBe(false)
  })
})
