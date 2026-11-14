// O que vai escrito sobre o mapa: as etiquetas (HTML por cima do canvas) das entradas e das lojas, e
// quais lojas têm o nome deitado sobre o bloco (RotulosDasLojas). Funções puras, testadas em
// tests/unidade/mapa-entradas.test.ts.
import { CAIXAS, GRAFO, LOJAS_DA_PLANTA } from './dados'
import { entradasDoPiso } from './entradas'
import type { Piso } from './grafo'
import { rotuloDaLoja } from './nomesNaPlanta'
import type { Caixa } from './svg'

export const ESPESSURA_DO_PISO = 0.3

/** Altura das lojas proporcional ao tamanho do piso (o térreo tem 370 m; a praça, 64 m). */
export const alturaDoPiso = (caixa: Caixa) => Math.max(caixa.largura, caixa.altura) * 0.012

/** Etiqueta sobre o mapa (nome da loja, entrada, "Você está aqui"). */
export interface Etiqueta {
  id: string
  texto: string
  posicao: [x: number, y: number, z: number]
  estilo: 'loja' | 'escolhida' | 'entrada' | 'voce'
  /** Só nas entradas: o id dela, para o toque na etiqueta escolher a entrada. */
  entrada?: string
}

/**
 * As etiquetas de um piso. Cada entrada leva o nome dela; só a que o cliente disse que usou (ou a
 * do QR, ?origem=) vira "Você está aqui": sem escolha, o mapa não supõe onde ele está. Lojas: a
 * de destino, a que está sob o cursor e as grandes sem nome (as com nome já têm o nome deitado).
 */
export function etiquetasDoPiso(
  piso: Piso,
  {
    destinoAqui,
    origem,
    sobre,
    nomes,
    grandes,
  }: {
    destinoAqui?: string
    origem?: string
    sobre: string | null
    nomes?: Record<string, string>
    grandes: Set<string>
  },
): Etiqueta[] {
  const altura = alturaDoPiso(CAIXAS[piso])
  const entradas = entradasDoPiso(piso).flatMap((entrada): Etiqueta[] => {
    const ponto = GRAFO.pontos.get(entrada.id)
    if (!ponto) return []
    const aqui = entrada.id === origem
    return [
      {
        id: `entrada-${entrada.id}`,
        texto: aqui ? 'Você está aqui' : entrada.nome,
        posicao: [ponto.x, ESPESSURA_DO_PISO + altura * 1.6, ponto.y],
        estilo: aqui ? 'voce' : 'entrada',
        entrada: entrada.id,
      },
    ]
  })
  const grandesSemNome = [...grandes].filter((id) => !nomes?.[id])
  const comEtiqueta = new Set([...grandesSemNome, destinoAqui, sobre])
  const lojas: Etiqueta[] = LOJAS_DA_PLANTA[piso]
    .filter((l) => comEtiqueta.has(l.mapaId))
    .map((l) => ({
      id: `loja-${l.mapaId}`,
      texto: rotuloDaLoja(l.mapaId, nomes),
      posicao: [l.centro.x, ESPESSURA_DO_PISO + altura * (l.mapaId === destinoAqui ? 2.6 : 1.4), l.centro.y],
      estilo: l.mapaId === destinoAqui ? 'escolhida' : 'loja',
    }))
  return [...entradas, ...lojas]
}

/**
 * As lojas com o nome deitado sobre o bloco: as que têm nome, menos a de destino, que já tem a
 * etiqueta em destaque por cima (o nome não aparece duas vezes).
 */
export function lojasComNomeDeitado(piso: Piso, nomes: Record<string, string>, destino?: string) {
  return LOJAS_DA_PLANTA[piso].filter((l) => nomes[l.mapaId] && l.mapaId !== destino)
}
