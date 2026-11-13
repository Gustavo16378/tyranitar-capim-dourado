import type { Periodo } from '../../tipos/painel'

/** As opções do filtro de período dos relatórios, para o Segmentos. */
export const PERIODOS: readonly { valor: Periodo; rotulo: string }[] = [
  { valor: '7d', rotulo: '7 dias' },
  { valor: '30d', rotulo: '30 dias' },
  { valor: '90d', rotulo: '90 dias' },
]
