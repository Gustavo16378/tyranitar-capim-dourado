import type { Relatorio } from '../../../tipos/loja'
import type { PARTES_DAS_RESERVAS } from './cores'

export type Partes = Record<(typeof PARTES_DAS_RESERVAS)[number]['chave'], number>

/**
 * As partes da barra das reservas: as recusadas pela loja num bloco (é a parte que a loja decide);
 * as canceladas pelo cliente e as expiradas somam num bloco só.
 */
export function partesDasReservas(reservas: Relatorio['reservas']): Partes {
  return {
    retiradas: reservas.retiradas,
    emAberto: reservas.emAberto,
    recusadas: reservas.recusadas,
    perdidas: reservas.canceladas + reservas.expiradas,
  }
}

/** Parte de um total em porcentagem inteira; 0 quando o total é 0. */
export function porcentagem(parte: number, total: number) {
  return total ? Math.round((parte / total) * 100) : 0
}
