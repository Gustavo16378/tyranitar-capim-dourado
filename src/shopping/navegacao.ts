// As telas do painel do shopping, na ordem da barra lateral. Tela nova: crie a pasta em
// telas/ e acrescente uma linha aqui; a rota e o item da barra lateral saem desta lista.
import type { TelaDoPainel } from '../painel/painel'
import { TelaLojas } from './telas/lojas/TelaLojas'

export const TELAS_DO_SHOPPING: readonly TelaDoPainel[] = [
  { caminho: 'lojas', rotulo: 'Lojas', Tela: TelaLojas },
]
