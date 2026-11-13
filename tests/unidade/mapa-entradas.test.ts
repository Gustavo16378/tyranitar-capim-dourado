// O mapa e as entradas (docs/evidencias-testes.md): a rota sai da entrada que o cliente escolheu,
// a escolha fica lembrada por uma visita, "Você está aqui" só aparece com uma escolha e a loja de
// destino tem o nome escrito uma vez só.
import { describe, expect, it } from 'vitest'
import { acharNaPlanta, GRAFO, LOJAS_DA_PLANTA, rotaAte } from '../../src/mapa/dados'
import {
  acharEntrada,
  ENTRADAS,
  entradasDoPiso,
  escolhaLembrada,
  lembrarEscolha,
  MAIS_PROXIMA,
  VALIDADE_DA_ESCOLHA_MS,
  type Armazem,
} from '../../src/mapa/entradas'
import { etiquetasDoPiso, lojasComNomeDeitado } from '../../src/mapa/etiquetas'
import { lojasGrandes } from '../../src/mapa/nomesNaPlanta'

function armazemDeTeste(): Armazem & { dados: Map<string, string> } {
  const dados = new Map<string, string>()
  return { dados, getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => void dados.set(k, v) }
}

/** Uma loja do térreo com rota, para os testes. */
const LOJA = LOJAS_DA_PLANTA[1].find((l) => rotaAte(l.mapaId))!.mapaId

describe('entradas do mapa', () => {
  it('cada entrada do grafo tem nome, no piso certo', () => {
    const doGrafo = [...GRAFO.pontos.values()].filter((p) => p.tipo === 'entrada')
    expect(ENTRADAS.map((e) => e.id).sort()).toEqual(doGrafo.map((p) => p.id).sort())
    for (const entrada of ENTRADAS) expect(GRAFO.pontos.get(entrada.id)?.piso).toBe(entrada.piso)
    expect(entradasDoPiso(1).map((e) => e.nome)).toEqual(['Entrada A', 'Entrada B', 'Entrada C'])
  })

  it('a rota sai da entrada escolhida; sem escolha, da mais próxima; entrada de outro piso não vale', () => {
    const maisProxima = rotaAte(LOJA)!
    for (const entrada of entradasDoPiso(1)) {
      const rota = rotaAte(LOJA, entrada.id)!
      expect(rota.pontos[0].id).toBe(entrada.id)
      expect(rota.metros).toBeGreaterThanOrEqual(maisProxima.metros)
    }
    expect(rotaAte(LOJA, entradasDoPiso(2)[0].id)).toEqual(maisProxima)
    expect(rotaAte(LOJA, 'nao-existe')).toEqual(maisProxima)
  })

  it('a escolha fica lembrada por uma visita (6 h), por piso', () => {
    const armazem = armazemDeTeste()
    const agora = Date.UTC(2026, 10, 13, 15)
    expect(escolhaLembrada(1, armazem, agora)).toBeNull()
    lembrarEscolha(1, 'p1-c116', armazem, agora)
    lembrarEscolha(2, MAIS_PROXIMA, armazem, agora)
    expect(escolhaLembrada(1, armazem, agora + 60_000)).toBe('p1-c116')
    expect(escolhaLembrada(2, armazem, agora + 60_000)).toBe(MAIS_PROXIMA)
    expect(escolhaLembrada(1, armazem, agora + VALIDADE_DA_ESCOLHA_MS + 1)).toBeNull()
    // Uma entrada de outro piso, ou o armazém corrompido, não valem.
    lembrarEscolha(1, 'p2-c4', armazem, agora)
    expect(escolhaLembrada(1, armazem, agora)).toBeNull()
    armazem.dados.set('capi.mapa.entrada', '{quebrado')
    expect(escolhaLembrada(1, armazem, agora)).toBeNull()
    // Sem localStorage, nada quebra.
    expect(escolhaLembrada(1, undefined, agora)).toBeNull()
    expect(() => lembrarEscolha(1, 'p1-c1', undefined, agora)).not.toThrow()
  })

  it('"Você está aqui" só na entrada escolhida; sem escolha, as entradas levam o nome', () => {
    const grandes = lojasGrandes(LOJAS_DA_PLANTA[1])
    const semEscolha = etiquetasDoPiso(1, { destinoAqui: LOJA, sobre: null, grandes })
    expect(semEscolha.filter((e) => e.texto === 'Você está aqui')).toEqual([])
    expect(semEscolha.filter((e) => e.estilo === 'entrada').map((e) => e.texto)).toEqual(['Entrada A', 'Entrada B', 'Entrada C'])

    const comEscolha = etiquetasDoPiso(1, { destinoAqui: LOJA, origem: 'p1-c116', sobre: null, grandes })
    expect(comEscolha.filter((e) => e.texto === 'Você está aqui').map((e) => e.id)).toEqual(['entrada-p1-c116'])
    expect(acharEntrada('p1-c116')?.nome).toBe('Entrada B')
  })

  it('a loja de destino tem o nome escrito uma vez só: na etiqueta, não deitado sobre o bloco', () => {
    const nomes = { [LOJA]: 'Centauro' }
    const grandes = lojasGrandes(LOJAS_DA_PLANTA[1])
    const etiquetas = etiquetasDoPiso(1, { destinoAqui: LOJA, sobre: null, nomes, grandes })
    expect(etiquetas.filter((e) => e.texto === 'Centauro')).toEqual([expect.objectContaining({ estilo: 'escolhida' })])
    expect(lojasComNomeDeitado(1, nomes, LOJA).map((l) => l.mapaId)).not.toContain(LOJA)
    // Sem ser o destino, ela tem o nome deitado (e nenhuma etiqueta).
    expect(lojasComNomeDeitado(1, nomes).map((l) => l.mapaId)).toEqual([LOJA])
    expect(acharNaPlanta(LOJA)?.piso).toBe(1)
  })
})
