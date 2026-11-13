// As telas do painel, na ordem da barra lateral. Tela nova: crie a pasta em telas/ e
// acrescente uma linha aqui; a rota e o item da barra lateral saem desta lista.
import { lazy, type ComponentType } from 'react'
import { TelaAtendimento } from './telas/atendimento/TelaAtendimento'
import { TelaCupons } from './telas/cupons/TelaCupons'
import { TelaProdutos } from './telas/produtos/TelaProdutos'
import { TelaReservas } from './telas/reservas/TelaReservas'

// Tela com biblioteca pesada vem sob demanda: o Desempenho traz o recharts, que só é
// baixado quando alguém abre a tela. O Suspense fica no LayoutLoja.
const TelaDesempenho = lazy(() =>
  import('./telas/desempenho/TelaDesempenho').then((modulo) => ({ default: modulo.TelaDesempenho })),
)

export interface TelaDaLoja {
  /** Pedaço da URL depois de /loja/. */
  caminho: string
  /** Nome na barra lateral. */
  rotulo: string
  Tela: ComponentType
}

export const TELAS_DA_LOJA: readonly TelaDaLoja[] = [
  { caminho: 'atendimento', rotulo: 'Atendimento', Tela: TelaAtendimento },
  { caminho: 'reservas', rotulo: 'Reservas', Tela: TelaReservas },
  { caminho: 'produtos', rotulo: 'Produtos', Tela: TelaProdutos },
  { caminho: 'cupons', rotulo: 'Cupons', Tela: TelaCupons },
  { caminho: 'desempenho', rotulo: 'Desempenho', Tela: TelaDesempenho },
]

