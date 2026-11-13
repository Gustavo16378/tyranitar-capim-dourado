// As plantas e o grafo prontos para usar: quem desenha o mapa importa daqui.
import { montarGrafo, rotaAteALoja, type Piso } from './grafo'
import planta1 from './piso-1.svg?raw'
import planta2 from './piso-2.svg?raw'
import rotas from './rotas.json'
import { lerLojas, lerViewBox, type LojaNaPlanta } from './svg'

export const PLANTAS: Record<Piso, string> = { 1: planta1, 2: planta2 }
export const CAIXAS = { 1: lerViewBox(planta1), 2: lerViewBox(planta2) }
export const LOJAS_DA_PLANTA: Record<Piso, LojaNaPlanta[]> = { 1: lerLojas(planta1), 2: lerLojas(planta2) }
export const GRAFO = montarGrafo(rotas)

const PISO_DA_LOJA = new Map<string, { piso: Piso; loja: LojaNaPlanta }>()
for (const piso of [1, 2] as const) for (const loja of LOJAS_DA_PLANTA[piso]) PISO_DA_LOJA.set(loja.mapaId, { piso, loja })

/** Em que piso fica a loja (e o polígono dela), ou undefined se ela não está na planta. */
export function acharNaPlanta(mapaId: string) {
  return PISO_DA_LOJA.get(mapaId)
}

/** A rota da entrada mais próxima até a loja, no piso dela. */
export function rotaAte(mapaId: string) {
  const achada = acharNaPlanta(mapaId)
  return achada ? rotaAteALoja(GRAFO, mapaId, achada.piso, achada.loja.centro) : null
}
