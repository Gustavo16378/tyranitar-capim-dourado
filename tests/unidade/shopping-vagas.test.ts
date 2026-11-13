import { beforeEach, describe, expect, it } from 'vitest'
import { reiniciarMocks, responderMock } from '../../src/mocks/shopping'
import { encaixe, PERFIS_DE_LOJA, sugerirVagas, type VagaParaCruzar } from '../../src/mocks/shopping/sugerirVagas'
import type { RespostaLogin, VagasEDemanda } from '../../src/tipos/shopping'

const perfil = (categoria: string) => PERFIS_DE_LOJA.find((p) => p.categoria === categoria)!
const vaga = (id: string, areaM2: number, piso: 1 | 2 = 1): VagaParaCruzar => ({ id, unidade: `LOJA ${id}`, piso, areaM2, mapaId: `loja-${id}` })
const procura = (categoria: string, buscas: number) => ({ categoria, buscas, termos: [] })

describe('sugerirVagas: a regra', () => {
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
})

describe('mocks do shopping: GET /api/shopping/vagas', () => {
  let token: string | null = null

  async function chamar<T = unknown>(metodo: string, url: string, corpo?: unknown) {
    const resposta = await responderMock({ metodo, url, corpo: corpo === undefined ? undefined : JSON.stringify(corpo), token })
    if (!resposta) throw new Error(`${metodo} ${url} não está mockada`)
    return { status: resposta.status, corpo: (await resposta.json()) as T }
  }

  beforeEach(async () => {
    reiniciarMocks()
    token = null
    token = (await chamar<RespostaLogin>('POST', '/api/auth/login', { email: 'admin@demo.test', senha: '12345678' })).corpo.token
  })

  it('cruza as 13 vagas da planta com a demanda de 30 dias', async () => {
    const { corpo } = await chamar<VagasEDemanda>('GET', '/api/shopping/vagas?periodo=30d')
    expect(corpo.resumo).toEqual({ vagas: 13, areaTotalM2: 1117.22, buscasSemResultado: 1412, buscasComVaga: 1340 })
    const sugestao = Object.fromEntries(corpo.vagas.map((v) => [v.unidade, v.sugestao?.categoria]))
    expect(sugestao).toMatchObject({
      'LOJA 143': 'eletronicos',
      'LOJA 141': 'esportes',
      'LOJA 47': 'casa',
      'LOJA 203': 'alimentacao',
      'LOJA 205': 'alimentacao',
    })
    expect(corpo.vagas.every((v) => v.sugestao)).toBe(true)
    // A mais forte primeiro: eletrônicos, com 269 buscas.
    expect(corpo.vagas[0]).toMatchObject({ unidade: 'LOJA 143', sugestao: { buscas: 269, encaixe: 'IDEAL', repetida: false } })
    expect(corpo.demanda.filter((d) => d.motivoSemVaga).map((d) => d.categoria)).toEqual(['livraria', 'joias'])
  })

  it('a vaga ocupada na tela de Lojas sai do cruzamento', async () => {
    await chamar('PUT', '/api/shopping/lojas/loja-143', {
      nome: 'Eletrônicos do Cerrado',
      cnpj: '12345678000190',
      tipo: 'loja',
      categorias: ['eletronicos'],
      ativa: true,
    })
    const { corpo } = await chamar<VagasEDemanda>('GET', '/api/shopping/vagas?periodo=30d')
    expect(corpo.resumo.vagas).toBe(12)
    expect(corpo.vagas.some((v) => v.unidade === 'LOJA 143')).toBe(false)
  })
})
