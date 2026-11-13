// A regra que sugere que tipo de loja buscar para cada vaga (functions/_lib/regras/vagas.ts),
// com as 13 vagas da planta e a demanda de 30 dias do seed: o argumento do pitch.
import { describe, expect, it } from 'vitest'
import { CATEGORIAS_DO_SHOPPING } from '../../../functions/_lib/regras/categorias'
import { encaixe, PERFIS_DE_LOJA, sugerirVagas, type VagaParaCruzar } from '../../../functions/_lib/regras/vagas'
import { CATEGORIAS_DO_SHOPPING as CATEGORIAS_DO_FRONT } from '../../../src/painel/comum/categorias'

const perfil = (categoria: string) => PERFIS_DE_LOJA.find((p) => p.categoria === categoria)!
const vaga = (id: string, areaM2: number, piso: 1 | 2 = 1): VagaParaCruzar => ({ id, unidade: `LOJA ${id}`, piso, areaM2, mapaId: `loja-${id}` })
const procura = (categoria: string, buscas: number) => ({ categoria, buscas, termos: [] })

describe('sugerirVagas', () => {
  it('encaixa pela faixa de área e pelo piso', () => {
    expect(encaixe({ piso: 1, areaM2: 116 }, perfil('eletronicos'))).toBe('IDEAL')
    expect(encaixe({ piso: 1, areaM2: 52 }, perfil('eletronicos'))).toBe('POSSIVEL') // até 20% menor
    expect(encaixe({ piso: 1, areaM2: 40 }, perfil('eletronicos'))).toBeNull()
    expect(encaixe({ piso: 2, areaM2: 116 }, perfil('eletronicos'))).toBeNull() // o 2º piso é a praça de alimentação
    expect(encaixe({ piso: 1, areaM2: 58 }, perfil('alimentacao'))).toBeNull()
    expect(encaixe({ piso: 1, areaM2: null }, perfil('calcados'))).toBeNull()
  })

  it('dá a vaga para a categoria mais procurada que cabe, e a maior vaga para quem precisa dela', () => {
    const { vagas } = sugerirVagas([vaga('a', 300), vaga('b', 100)], [procura('esportes', 50), procura('eletronicos', 200)])
    const de = Object.fromEntries(vagas.map((v) => [v.id, v.sugestao?.categoria]))
    // Eletrônicos fica com a de 100 m² (mais perto do meio da faixa) e deixa a de 300 m² para esportes.
    expect(de).toEqual({ a: 'esportes', b: 'eletronicos' })
  })

  it('só repete uma categoria quando a procura dela, dividida, ainda ganha das outras', () => {
    const duas = sugerirVagas([vaga('a', 60), vaga('b', 60)], [procura('calcados', 400), procura('pet', 90)])
    expect(duas.vagas.map((v) => v.sugestao?.categoria).sort()).toEqual(['calcados', 'calcados'])
    expect(duas.vagas.find((v) => v.sugestao?.repetida)?.sugestao?.motivo).toMatch(/^Segunda loja de Calçados/)
    const variadas = sugerirVagas([vaga('a', 60), vaga('b', 60)], [procura('calcados', 300), procura('pet', 90)])
    expect(variadas.vagas.map((v) => v.sugestao?.categoria).sort()).toEqual(['calcados', 'pet'])
  })

  it('explica por que uma categoria ficou sem vaga', () => {
    const { demanda } = sugerirVagas([vaga('a', 40)], [procura('casa', 80), procura('otica', 120), procura('joias', 10)])
    expect(demanda.find((d) => d.categoria === 'casa')?.motivoSemVaga).toMatch(/Nenhuma vaga tem o tamanho de Casa e decoração \(100 a 400 m²\)/)
    expect(demanda.find((d) => d.categoria === 'joias')?.motivoSemVaga).toMatch(/mais procuradas/)
    expect(demanda.find((d) => d.categoria === 'otica')).toMatchObject({ vagas: ['loja-a'], motivoSemVaga: null })
  })

  it('as 13 vagas da planta com a demanda de 30 dias do seed: o que buscar para cada uma', () => {
    // seed/lojas.csv (situacao VAGA) e as buscas sem resultado de scripts/gerar-seed.mjs.
    const vagas = [
      vaga('31', 41.2), vaga('30', 40.67), vaga('48A', 35), vaga('48', 35), vaga('47', 229.9), vaga('141', 311.55),
      vaga('142', 35.96), vaga('143', 116.1), vaga('131', 54.99), vaga('133', 62.13), vaga('132', 60.4),
      vaga('203', 58.81, 2), vaga('205', 35.51, 2),
    ]
    const demanda = [
      procura('eletronicos', 269), procura('infantil', 187), procura('calcados', 181), procura('alimentacao', 176),
      procura('pet', 130), procura('esportes', 101), procura('casa', 84), procura('acessorios', 68), procura('otica', 55),
      procura('livraria', 53), procura('roupas', 47), procura('perfumaria', 42), procura('joias', 19),
    ]
    const cruzamento = sugerirVagas(vagas, demanda)
    expect(cruzamento.vagas.map((v) => [v.unidade, v.sugestao?.categoria, v.sugestao?.repetida])).toEqual([
      ['LOJA 143', 'eletronicos', false],
      ['LOJA 133', 'infantil', false],
      ['LOJA 132', 'calcados', false],
      ['LOJA 203', 'alimentacao', false],
      ['LOJA 131', 'pet', false],
      ['LOJA 141', 'esportes', false],
      ['LOJA 47', 'casa', false],
      ['LOJA 48A', 'acessorios', false],
      ['LOJA 30', 'otica', false],
      ['LOJA 31', 'roupas', false],
      ['LOJA 142', 'calcados', true],
      ['LOJA 205', 'alimentacao', true],
      ['LOJA 48', 'perfumaria', false],
    ])
    const semVaga = cruzamento.demanda.filter((d) => d.motivoSemVaga).map((d) => d.categoria)
    expect(semVaga).toEqual(['livraria', 'joias'])
    // 1.340 das 1.412 buscas sem resultado (95%) passam a ter loja.
    expect(cruzamento.demanda.filter((d) => d.vagas.length).reduce((soma, d) => soma + d.buscas, 0)).toBe(1340)
  })

  it('as categorias do servidor são as mesmas do painel, com os mesmos nomes', () => {
    expect([...CATEGORIAS_DO_SHOPPING]).toEqual([...CATEGORIAS_DO_FRONT])
  })
})
