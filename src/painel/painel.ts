// O que define um painel (o da loja, o do shopping): nome, endereço, perfil que entra,
// telas, sessão e login. Cada painel monta a sua configuração (src/loja/RotasLoja.tsx) e o
// RotasDoPainel faz o resto: login, guarda de perfil, barra lateral e rotas das telas.
import { createContext, useContext, type ComponentType, type ReactNode } from 'react'
import type { PedidoLogin, Perfil, RespostaLogin } from '../tipos'
import type { ArmazemDeSessao } from './api/sessao'

export interface TelaDoPainel {
  /** Pedaço da URL depois da base: 'reservas' → /loja/reservas. */
  caminho: string
  /** Nome na barra lateral. */
  rotulo: string
  Tela: ComponentType
}

export interface ConfigDoPainel {
  /** "Painel da loja": aparece na barra lateral, no login e no título da aba. */
  nome: string
  /** Onde o painel está montado no App: "/loja". */
  base: string
  /** Só entra quem tem este perfil. */
  perfil: Perfil
  /** Na ordem da barra lateral; a primeira é a tela inicial. */
  telas: readonly TelaDoPainel[]
  sessao: ArmazemDeSessao
  entrar: (pedido: PedidoLogin) => Promise<RespostaLogin>
  /** Mostra o selo "Dados de exemplo" e a dica de login. */
  mocksLigados: boolean
  /** A frase do login: "Entre com o e-mail e a senha da sua loja." */
  chamadaDoLogin: string
  /** Que e-mail usar enquanto os mocks respondem. */
  dicaComMocks: ReactNode
}

export const ContextoDoPainel = createContext<ConfigDoPainel | null>(null)

/** A configuração do painel em que a tela está. */
export function usePainel() {
  const painel = useContext(ContextoDoPainel)
  if (!painel) throw new Error('usePainel fora de um RotasDoPainel')
  return painel
}

export function urlNoPainel(painel: Pick<ConfigDoPainel, 'base'>, caminho: string) {
  return `${painel.base}/${caminho}`
}
