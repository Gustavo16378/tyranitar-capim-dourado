// A regra que cruza as buscas sem resultado com as lojas vagas: que tipo de loja buscar para
// cada vaga. Pura e testada (tests/unidade/shopping-vagas.test.ts), para a API real portar
// para functions/_lib/regras/ do jeito que está. A regra está descrita em docs/api.md
// (GET /api/shopping/vagas).
//
// 1. Cada categoria tem uma faixa de área típica e um piso (alimentação só na praça, no 2º).
// 2. Encaixe IDEAL: a área está na faixa. POSSIVEL: até 20% menor ou 25% maior.
// 3. A vaga recebe a categoria de maior nota: buscas sem resultado × 1 (ideal) ou 0,6
//    (possível), e × 0,25 a cada vaga que a categoria já ganhou, para as sugestões variarem.
// 4. Repete até não sobrar par que caiba. No empate, a vaga mais perto do meio da faixa.
import type { BuscaContada, Encaixe, VagaComSugestao, VagasEDemanda } from '../../tipos/shopping'
import { rotuloDaCategoria } from '../../painel/comum/categorias'
import { formatarArea } from '../../painel/comum/formatos'

export interface PerfilDeLoja {
  categoria: string
  areaMinM2: number
  areaMaxM2: number
  piso: 1 | 2
}

/** O tamanho típico de cada tipo de loja num shopping deste porte. */
export const PERFIS_DE_LOJA: readonly PerfilDeLoja[] = [
  { categoria: 'alimentacao', areaMinM2: 25, areaMaxM2: 120, piso: 2 },
  { categoria: 'eletronicos', areaMinM2: 60, areaMaxM2: 250, piso: 1 },
  { categoria: 'esportes', areaMinM2: 150, areaMaxM2: 500, piso: 1 },
  { categoria: 'casa', areaMinM2: 100, areaMaxM2: 400, piso: 1 },
  { categoria: 'livraria', areaMinM2: 80, areaMaxM2: 350, piso: 1 },
  { categoria: 'infantil', areaMinM2: 60, areaMaxM2: 200, piso: 1 },
  { categoria: 'pet', areaMinM2: 50, areaMaxM2: 150, piso: 1 },
  { categoria: 'roupas', areaMinM2: 40, areaMaxM2: 300, piso: 1 },
  { categoria: 'calcados', areaMinM2: 35, areaMaxM2: 120, piso: 1 },
  { categoria: 'otica', areaMinM2: 25, areaMaxM2: 60, piso: 1 },
  { categoria: 'perfumaria', areaMinM2: 25, areaMaxM2: 90, piso: 1 },
  { categoria: 'acessorios', areaMinM2: 20, areaMaxM2: 60, piso: 1 },
  { categoria: 'joias', areaMinM2: 20, areaMaxM2: 50, piso: 1 },
]

const FOLGA_MENOR = 0.8
const FOLGA_MAIOR = 1.25
const PESO: Record<Encaixe, number> = { IDEAL: 1, POSSIVEL: 0.6 }
const REPETIDA = 0.25

export interface VagaParaCruzar {
  id: string
  unidade: string
  piso: 1 | 2
  areaM2: number | null
  mapaId: string
}

export interface DemandaDaCategoria {
  categoria: string
  buscas: number
  termos: BuscaContada[]
}

export function encaixe(vaga: Pick<VagaParaCruzar, 'piso' | 'areaM2'>, perfil: PerfilDeLoja): Encaixe | null {
  if (vaga.areaM2 === null || vaga.piso !== perfil.piso) return null
  if (vaga.areaM2 >= perfil.areaMinM2 && vaga.areaM2 <= perfil.areaMaxM2) return 'IDEAL'
  if (vaga.areaM2 >= perfil.areaMinM2 * FOLGA_MENOR && vaga.areaM2 <= perfil.areaMaxM2 * FOLGA_MAIOR) return 'POSSIVEL'
  return null
}

/** Quão longe a área está do meio da faixa (média geométrica), em escala log: 0 é no meio. */
function distanciaDoMeio(areaM2: number, perfil: PerfilDeLoja) {
  return Math.abs(Math.log(areaM2 / Math.sqrt(perfil.areaMinM2 * perfil.areaMaxM2)))
}

const faixa = (perfil: PerfilDeLoja) => `${perfil.areaMinM2} a ${perfil.areaMaxM2} m²`

/** Por que a categoria serve para a vaga: o tamanho e o piso (as buscas vêm em outro campo). */
function motivo(vaga: VagaParaCruzar, perfil: PerfilDeLoja, qual: Encaixe, repetida: boolean) {
  const nome = rotuloDaCategoria(perfil.categoria)
  const area = formatarArea(vaga.areaM2 ?? 0)
  const tamanho =
    qual === 'IDEAL'
      ? `${area} é o tamanho típico de ${nome} (${faixa(perfil)})`
      : `${area} é ${(vaga.areaM2 ?? 0) < perfil.areaMinM2 ? 'um pouco menos' : 'um pouco mais'} que o típico de ${nome} (${faixa(perfil)}), mas cabe`
  const onde = vaga.piso === 2 ? ' Fica na praça de alimentação.' : ''
  return repetida
    ? `Segunda loja de ${nome}: a procura dá para mais de uma, e ${tamanho}.${onde}`
    : `A unidade serve: ${tamanho}.${onde}`
}

export function sugerirVagas(
  vagas: readonly VagaParaCruzar[],
  demanda: readonly DemandaDaCategoria[],
  perfis: readonly PerfilDeLoja[] = PERFIS_DE_LOJA,
): Pick<VagasEDemanda, 'vagas' | 'demanda'> {
  const perfilDe = (categoria: string) => perfis.find((p) => p.categoria === categoria)
  const procuradas = demanda.filter((d) => d.buscas > 0 && perfilDe(d.categoria))
  const usos = new Map<string, number>()
  const escolhas = new Map<string, { demanda: DemandaDaCategoria; encaixe: Encaixe; repetida: boolean }>()

  for (;;) {
    let melhor: { vaga: VagaParaCruzar; demanda: DemandaDaCategoria; encaixe: Encaixe; nota: number; distancia: number } | null = null
    for (const vaga of vagas) {
      if (escolhas.has(vaga.id) || vaga.areaM2 === null) continue
      for (const d of procuradas) {
        const perfil = perfilDe(d.categoria)!
        const qual = encaixe(vaga, perfil)
        if (!qual) continue
        const nota = d.buscas * PESO[qual] * REPETIDA ** (usos.get(d.categoria) ?? 0)
        const distancia = distanciaDoMeio(vaga.areaM2, perfil)
        if (!melhor || nota > melhor.nota || (nota === melhor.nota && distancia < melhor.distancia)) {
          melhor = { vaga, demanda: d, encaixe: qual, nota, distancia }
        }
      }
    }
    if (!melhor) break
    const vezes = usos.get(melhor.demanda.categoria) ?? 0
    escolhas.set(melhor.vaga.id, { demanda: melhor.demanda, encaixe: melhor.encaixe, repetida: vezes > 0 })
    usos.set(melhor.demanda.categoria, vezes + 1)
  }

  const comSugestao: VagaComSugestao[] = vagas.map((vaga) => {
    const escolha = escolhas.get(vaga.id)
    const alternativas = procuradas
      .filter((d) => d.categoria !== escolha?.demanda.categoria)
      .map((d) => ({ categoria: d.categoria, buscas: d.buscas, encaixe: encaixe(vaga, perfilDe(d.categoria)!) }))
      .filter((a): a is { categoria: string; buscas: number; encaixe: Encaixe } => a.encaixe !== null)
      .sort((a, b) => b.buscas - a.buscas)
      .slice(0, 3)
    return {
      ...vaga,
      sugestao: escolha
        ? {
            categoria: escolha.demanda.categoria,
            buscas: escolha.demanda.buscas,
            termos: escolha.demanda.termos,
            encaixe: escolha.encaixe,
            motivo: motivo(vaga, perfilDe(escolha.demanda.categoria)!, escolha.encaixe, escolha.repetida),
            repetida: escolha.repetida,
          }
        : null,
      alternativas,
    }
  })

  // Da sugestão mais forte para a mais fraca; segunda loja de uma categoria depois; sem sugestão no fim.
  const forca = (v: VagaComSugestao) => (v.sugestao ? v.sugestao.buscas * (v.sugestao.repetida ? REPETIDA : 1) : -1)
  comSugestao.sort((a, b) => forca(b) - forca(a))

  return {
    vagas: comSugestao,
    demanda: demanda.map((d) => {
      const perfil = perfilDe(d.categoria)
      const suas = comSugestao.filter((v) => v.sugestao?.categoria === d.categoria).map((v) => v.mapaId)
      const alguemCabe = perfil ? vagas.some((v) => encaixe(v, perfil)) : false
      return {
        ...d,
        vagas: suas,
        faixaM2: perfil ? { min: perfil.areaMinM2, max: perfil.areaMaxM2 } : null,
        motivoSemVaga: suas.length
          ? null
          : !perfil
            ? 'Não há um tamanho de loja definido para esta categoria.'
            : alguemCabe
              ? 'As vagas do tamanho certo ficaram com categorias mais procuradas.'
              : `Nenhuma vaga tem o tamanho de ${rotuloDaCategoria(d.categoria)} (${faixa(perfil)}${perfil.piso === 2 ? ', no 2º piso' : ''}).`,
      }
    }),
  }
}
