// O que o cliente já viu na carteira, para animar só o que mudou desde a última visita: os
// pontos somando (movimento 3 da marca) e o "subiu de nível" (movimento 4). Fica no aparelho.
import { ORDEM_NIVEIS } from '../componentes/nivel'
import type { NivelApi } from '../tipos'
import { paraNivel } from './formatos'

export interface Vista {
  pontos: number
  nivel: NivelApi
}

const chave = (usuarioId: string) => `carteira-vista:${usuarioId}`

export function lerVista(usuarioId: string): Vista | null {
  try {
    const vista = JSON.parse(localStorage.getItem(chave(usuarioId)) ?? 'null') as Partial<Vista> | null
    return typeof vista?.pontos === 'number' && typeof vista.nivel === 'string' ? (vista as Vista) : null
  } catch {
    return null
  }
}

export function guardarVista(usuarioId: string, vista: Vista) {
  try {
    localStorage.setItem(chave(usuarioId), JSON.stringify(vista))
  } catch {
    // Sem armazenamento: a próxima visita anima de novo, sem problema.
  }
}

/**
 * Desde a última visita: de quantos pontos o número começa a contar e se o nível subiu. Na
 * primeira visita, os pontos contam do zero e não há "subiu de nível" (não dá para saber).
 */
export function desdeAUltimaVista(antes: Vista | null, agora: Vista) {
  const de = antes?.pontos ?? 0
  const ordem = (nivel: NivelApi) => ORDEM_NIVEIS.indexOf(paraNivel(nivel))
  return {
    de,
    somou: de !== agora.pontos,
    subiu: antes !== null && ordem(agora.nivel) > ordem(antes.nivel),
  }
}
