// Período dos relatórios dos painéis (?periodo=30d): os últimos 7, 30 ou 90 dias.
import { ErroApi } from '../erros'

export type Periodo = '7d' | '30d' | '90d'

const DIAS: Record<Periodo, number> = { '7d': 7, '30d': 30, '90d': 90 }

/** ?periodo= da URL; sem ele, 30d. Outro valor: 400. */
export function lerPeriodo(url: URL): Periodo {
  const periodo = url.searchParams.get('periodo')?.trim() || '30d'
  if (!(periodo in DIAS)) throw new ErroApi('DADOS_INVALIDOS', 'Use periodo 7d, 30d ou 90d.')
  return periodo as Periodo
}

/** O começo do período: agora menos os dias dele. */
export function inicioDoPeriodo(periodo: Periodo, agora = new Date()): Date {
  return new Date(agora.getTime() - DIAS[periodo] * 24 * 60 * 60 * 1000)
}
