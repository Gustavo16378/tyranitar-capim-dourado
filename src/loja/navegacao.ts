// As telas do painel, na ordem da barra lateral. Tela nova: crie a pasta em telas/ e
// acrescente uma linha aqui; a rota e o item da barra lateral saem desta lista.
import { lazy } from 'react'
import type { TelaDoPainel } from '../painel/painel'
import { TelaAtendimento } from './telas/atendimento/TelaAtendimento'
import { TelaCupons } from './telas/cupons/TelaCupons'
import { TelaExtrato } from './telas/extrato/TelaExtrato'
import { TelaProdutos } from './telas/produtos/TelaProdutos'
import { TelaReservas } from './telas/reservas/TelaReservas'

// Tela com biblioteca pesada vem sob demanda: o Desempenho traz o recharts, que só é
// baixado quando alguém abre a tela. O Suspense fica no LayoutPainel.
const TelaDesempenho = lazy(() =>
  import('./telas/desempenho/TelaDesempenho').then((modulo) => ({ default: modulo.TelaDesempenho })),
)

export const TELAS_DA_LOJA: readonly TelaDoPainel[] = [
  { caminho: 'atendimento', rotulo: 'Atendimento', Tela: TelaAtendimento },
  { caminho: 'reservas', rotulo: 'Reservas', Tela: TelaReservas },
  { caminho: 'produtos', rotulo: 'Produtos', Tela: TelaProdutos },
  { caminho: 'cupons', rotulo: 'Cupons', Tela: TelaCupons },
  { caminho: 'desempenho', rotulo: 'Desempenho', Tela: TelaDesempenho },
  { caminho: 'extrato', rotulo: 'Extrato', Tela: TelaExtrato },
]

