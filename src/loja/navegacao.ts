// As telas do painel, na ordem da barra lateral. Tela nova: crie a pasta em telas/ e
// acrescente uma linha aqui; a rota e o item da barra lateral saem desta lista.
import type { ComponentType } from 'react'
import { TelaAtendimento } from './telas/atendimento/TelaAtendimento'
import { TelaCupons } from './telas/cupons/TelaCupons'
import { TelaDesempenho } from './telas/desempenho/TelaDesempenho'
import { TelaProdutos } from './telas/produtos/TelaProdutos'
import { TelaReservas } from './telas/reservas/TelaReservas'

export const BASE_DA_LOJA = '/loja'

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

/** URL completa de uma tela: urlDaTela('reservas') → '/loja/reservas'. */
export function urlDaTela(caminho: string) {
  return `${BASE_DA_LOJA}/${caminho}`
}

export const URL_INICIAL = urlDaTela(TELAS_DA_LOJA[0].caminho)
export const URL_DE_ENTRAR = `${BASE_DA_LOJA}/entrar`
