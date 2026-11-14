// O easter egg "O tirano da sexta-feira 13" (docs/easter-egg.md, TU31 a TU36): os gatilhos (a
// palavra e os 13 toques), o modo tirano lembrado na sessão, o apagão dentro do limite de piscadas
// (WCAG 2.3.1), a Loja 13 num corredor livre do térreo e os personagens da equipe.
import { describe, expect, it } from 'vitest'
import { caminhoDoPersonagem, EQUIPE, inicial, nomeNoArquivo, POSES } from '../../src/easter-egg/equipe'
import { criarContadorDeToques, ehPalavraDoTirano, PAUSA_MAXIMA_MS, TOQUES_DO_SEGREDO } from '../../src/easter-egg/gatilhos'
import {
  caminhoAteALoja13,
  ENTRADA_DA_TRILHA,
  FACHADA_DA_LOJA_13,
  ID_DA_LOJA_13,
  LOJA_13,
  trilhaDeRachaduras,
} from '../../src/easter-egg/lugarDaLoja13'
import { CHAVE_DO_TIRANO, criarModoTirano, type Armazem } from '../../src/easter-egg/modoTirano'
import { mudancasDeClaridade, piscadasNoPiorSegundo, planoDoApagao } from '../../src/easter-egg/planoDoApagao'
import { GRAFO, LOJAS_DA_PLANTA, PLANTAS } from '../../src/mapa/dados'
import { acharEntrada } from '../../src/mapa/entradas'
import type { Ponto2D } from '../../src/mapa/svg'

describe('TU31: a palavra do tirano', () => {
  it('vale "tyranitar" sozinha, sem diferenciar maiúsculas e sem os espaços das pontas', () => {
    for (const texto of ['tyranitar', 'TYRANITAR', 'Tyranitar', 'TyRaNiTaR', '  tyranitar  ', '\ntyranitar\n']) {
      expect(ehPalavraDoTirano(texto), texto).toBe(true)
    }
  })

  it('não vale no meio de uma frase, com outra grafia ou vazia: essas vão para a Capi de verdade', () => {
    for (const texto of ['quero um tyranitar', 'tyranitar?', 'tiranitar', 'tyranitar13', 'tyra nitar', '']) {
      expect(ehPalavraDoTirano(texto), texto).toBe(false)
    }
  })
})

describe('TU32: os 13 toques', () => {
  it('o 13º toque seguido abre o segredo, e a contagem recomeça', () => {
    const contador = criarContadorDeToques()
    expect(TOQUES_DO_SEGREDO).toBe(13)
    for (let i = 1; i < 13; i++) expect(contador.tocar(i * 200), `toque ${i}`).toBe(false)
    expect(contador.toques).toBe(12)
    expect(contador.tocar(13 * 200)).toBe(true)
    expect(contador.toques).toBe(0)
    // Mais 12 não bastam de novo: são outros 13.
    for (let i = 14; i < 26; i++) expect(contador.tocar(i * 200)).toBe(false)
    expect(contador.tocar(26 * 200)).toBe(true)
  })

  it('uma pausa maior que 2 s entre dois toques recomeça a contagem', () => {
    const contador = criarContadorDeToques()
    for (let i = 0; i < 12; i++) contador.tocar(i * 100)
    const depois = 11 * 100 + PAUSA_MAXIMA_MS + 1
    expect(contador.tocar(depois)).toBe(false)
    expect(contador.toques).toBe(1)
    // Uma pausa de exatamente 2 s ainda conta como seguido.
    expect(contador.tocar(depois + PAUSA_MAXIMA_MS)).toBe(false)
    expect(contador.toques).toBe(2)
  })
})

function sessaoDeTeste(): Armazem & { dados: Map<string, string> } {
  const dados = new Map<string, string>()
  return {
    dados,
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => void dados.set(k, v),
    removeItem: (k) => void dados.delete(k),
  }
}

describe('TU33: o modo tirano', () => {
  it('acordar passa pelo apagão; no fim, o modo liga e a sessão lembra', () => {
    const sessao = sessaoDeTeste()
    const modo = criarModoTirano(sessao)
    let avisos = 0
    modo.assinar(() => avisos++)
    expect(modo.estado()).toMatchObject({ ligado: false, apagando: false })

    modo.acordar()
    expect(modo.estado()).toMatchObject({ ligado: false, apagando: true })
    // O apagão não é lembrado: recarregar no meio dele volta ao normal.
    expect(sessao.dados.has(CHAVE_DO_TIRANO)).toBe(false)

    modo.terminarApagao()
    expect(modo.estado()).toMatchObject({ ligado: true, apagando: false, nivelVisto: false })
    expect(avisos).toBe(2)

    // Recarregar a página (um modo novo com a mesma sessão) continua no escuro.
    expect(criarModoTirano(sessao).estado()).toMatchObject({ ligado: true, apagando: false })
  })

  it('o estado é o mesmo objeto até mudar (para a tela não redesenhar à toa)', () => {
    const modo = criarModoTirano(sessaoDeTeste())
    const antes = modo.estado()
    expect(modo.estado()).toBe(antes)
    modo.acordar()
    expect(modo.estado()).not.toBe(antes)
  })

  it('o nível Tirano sobe uma vez por sessão; "Acender as luzes" volta tudo ao normal', () => {
    const sessao = sessaoDeTeste()
    const modo = criarModoTirano(sessao)
    modo.acordar()
    modo.terminarApagao()
    modo.marcarNivelVisto()
    expect(criarModoTirano(sessao).estado().nivelVisto).toBe(true)
    // Acordar de novo com o tirano acordado não refaz o apagão.
    modo.acordar()
    expect(modo.estado().apagando).toBe(false)

    modo.acender()
    expect(modo.estado()).toMatchObject({ ligado: false, apagando: false, nivelVisto: false, acesas: 1 })
    expect(sessao.dados.has(CHAVE_DO_TIRANO)).toBe(false)
    expect(criarModoTirano(sessao).estado().ligado).toBe(false)
    // Com as luzes acesas, marcar o nível não faz nada.
    modo.marcarNivelVisto()
    expect(modo.estado().nivelVisto).toBe(false)
  })

  it('sem sessionStorage, ou com o valor estragado, o modo funciona e começa normal', () => {
    const quebrado: Armazem = {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => {
        throw new Error('bloqueado')
      },
      removeItem: () => {},
    }
    const modo = criarModoTirano(quebrado)
    modo.acordar()
    modo.terminarApagao()
    expect(modo.estado().ligado).toBe(true)
    const estragado = sessaoDeTeste()
    estragado.setItem(CHAVE_DO_TIRANO, '{não é json')
    expect(criarModoTirano(estragado).estado().ligado).toBe(false)
    expect(criarModoTirano(undefined).estado().ligado).toBe(false)
  })
})

describe('TU34: o apagão (WCAG 2.3.1)', () => {
  it('pisca no máximo 3 vezes em qualquer segundo e termina com tudo apagado', () => {
    const plano = planoDoApagao(false)
    expect(piscadasNoPiorSegundo(plano.luzes)).toBeLessThanOrEqual(3)
    expect(plano.luzes.at(-1)?.opacidade).toBe(1)
    expect(plano.tremor).toBeGreaterThan(0)
    expect(plano.rachaduras).not.toBeNull()
    // Os passos estão em ordem e terminam antes do fim do apagão.
    const instantes = plano.luzes.map((p) => p.em)
    expect([...instantes].sort((a, b) => a - b)).toEqual(instantes)
    expect(plano.fim).toBeGreaterThanOrEqual(plano.luzes.at(-1)!.em + plano.luzes.at(-1)!.duracao)
  })

  it('com movimento reduzido nada treme nem pisca: a tela só escurece', () => {
    const plano = planoDoApagao(true)
    expect(plano.tremor).toBe(0)
    expect(plano.rachaduras).toBeNull()
    expect(mudancasDeClaridade(plano.luzes)).toHaveLength(1)
    expect(plano.luzes.every((p, i) => i === 0 || p.opacidade >= plano.luzes[i - 1].opacidade)).toBe(true)
    expect(plano.luzes.at(-1)?.opacidade).toBe(1)
  })

  it('a conta das piscadas pega um roteiro que passaria do limite', () => {
    const rapido = Array.from({ length: 10 }, (_, i) => ({ em: i * 0.1, opacidade: i % 2 ? 0 : 1, duracao: 0.05 }))
    expect(piscadasNoPiorSegundo(rapido)).toBe(5)
  })
})

/** O ponto está dentro do polígono (raio para a direita). */
function dentro(p: Ponto2D, poligono: Ponto2D[]) {
  let resultado = false
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const a = poligono[i]
    const b = poligono[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) resultado = !resultado
  }
  return resultado
}

function distanciaAoSegmento(p: Ponto2D, a: Ponto2D, b: Ponto2D) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t)
}

const distanciaAoContorno = (p: Ponto2D, poligono: Ponto2D[]) =>
  Math.min(...poligono.map((a, i) => distanciaAoSegmento(p, a, poligono[(i + 1) % poligono.length])))

const CHAO = (() => {
  const pontos = PLANTAS[1].match(/id="piso"[^>]*points="([^"]+)"/)![1].trim().split(/[\s,]+/).map(Number)
  return Array.from({ length: pontos.length / 2 }, (_, i) => ({ x: pontos[2 * i], y: pontos[2 * i + 1] }))
})()

describe('TU35: a Loja 13 num corredor livre do térreo', () => {
  it('fica dentro do piso, longe de toda loja da planta, e não é a LOJA 13 de verdade', () => {
    expect(LOJA_13.piso).toBe(1)
    expect(ID_DA_LOJA_13).not.toBe('loja-13')
    for (const canto of LOJA_13.pontos) expect(dentro(canto, CHAO), `canto ${canto.x},${canto.y}`).toBe(true)
    for (const loja of LOJAS_DA_PLANTA[1]) {
      expect(loja.mapaId).not.toBe(ID_DA_LOJA_13)
      // Nenhum canto do bloco dentro de uma loja, nenhum vértice da loja dentro do bloco, e uma folga
      // de pelo menos 5 m (o corredor continua passando em volta).
      for (const canto of LOJA_13.pontos) {
        expect(dentro(canto, loja.pontos)).toBe(false)
        expect(distanciaAoContorno(canto, loja.pontos), `${loja.mapaId}`).toBeGreaterThan(5)
      }
      for (const vertice of loja.pontos) expect(dentro(vertice, LOJA_13.pontos)).toBe(false)
    }
  })

  it('a trilha sai da Entrada B, segue os corredores do grafo e termina na fachada da Loja 13', () => {
    expect(acharEntrada(ENTRADA_DA_TRILHA)?.nome).toBe('Entrada B')
    const caminho = caminhoAteALoja13()
    const entrada = GRAFO.pontos.get(ENTRADA_DA_TRILHA)!
    expect(caminho[0]).toEqual({ x: entrada.x, y: entrada.y })
    expect(caminho.at(-1)).toEqual(FACHADA_DA_LOJA_13)
    // Todo o caminho fica dentro do piso.
    for (const p of caminho) expect(dentro(p, CHAO)).toBe(true)

    // As rachaduras saem e chegam nos mesmos pontos, tremidas no meio, e saem iguais toda vez.
    const { tronco, galhos } = trilhaDeRachaduras()
    expect(tronco[0]).toEqual(caminho[0])
    expect(tronco.at(-1)).toEqual(FACHADA_DA_LOJA_13)
    expect(tronco.length).toBeGreaterThan(caminho.length)
    expect(galhos.length).toBeGreaterThan(0)
    expect(trilhaDeRachaduras()).toEqual({ tronco, galhos })
    // Nenhum ponto se afasta do caminho mais que o desvio (1,2 m) e um pouco.
    for (const p of tronco) {
      const perto = Math.min(...caminho.slice(1).map((b, i) => distanciaAoSegmento(p, caminho[i], b)))
      expect(perto).toBeLessThanOrEqual(1.21)
    }
  })
})

describe('TU36: os personagens da equipe', () => {
  it('cada integrante tem os PNGs das três poses, com o nome sem acento', () => {
    expect(EQUIPE.map((p) => nomeNoArquivo(p.nome))).toEqual(['gustavo-barbosa-lima', 'gustavo-ferreira', 'kaua', 'diogo'])
    expect(POSES).toEqual(['acenando', 'assustado', 'apontando'])
    expect(caminhoDoPersonagem('Kauã', 'apontando')).toBe('/easter-egg/equipe/kaua-apontando.png')
    expect(caminhoDoPersonagem('Gustavo Barbosa Lima', 'acenando')).toBe('/easter-egg/equipe/gustavo-barbosa-lima-acenando.png')
  })

  it('sem o PNG, o avatar mostra a inicial maiúscula', () => {
    expect(EQUIPE.map((p) => inicial(p.nome))).toEqual(['G', 'G', 'K', 'D'])
    expect(inicial('  ângela ')).toBe('Â')
  })
})
