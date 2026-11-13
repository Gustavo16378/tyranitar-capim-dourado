// As telas do painel do shopping, na ordem da barra lateral. Tela nova: crie a pasta em
// telas/ e acrescente uma linha aqui; a rota e o item da barra lateral saem desta lista.
import { lazy } from 'react'
import type { TelaDoPainel } from '../painel/painel'
import { TelaFidelidade } from './telas/fidelidade/TelaFidelidade'
import { TelaLojas } from './telas/lojas/TelaLojas'

// Telas com gráficos (recharts) vêm sob demanda; o Suspense fica no LayoutPainel.
const TelaDemanda = lazy(() => import('./telas/demanda/TelaDemanda').then((m) => ({ default: m.TelaDemanda })))

export const TELAS_DO_SHOPPING: readonly TelaDoPainel[] = [
  { caminho: 'lojas', rotulo: 'Lojas', Tela: TelaLojas },
  { caminho: 'fidelidade', rotulo: 'Fidelidade e campanhas', Tela: TelaFidelidade },
  { caminho: 'demanda', rotulo: 'Demanda', Tela: TelaDemanda },
]
