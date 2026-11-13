// O que define um painel (o da loja, o do shopping): nome, endereço, perfil que entra, telas e
// sessão. Cada painel monta a sua configuração (src/loja/RotasLoja.tsx) e o RotasDoPainel faz
// o resto: guarda de perfil, barra lateral e rotas das telas. O login é o único do app
// (/entrar), que grava a sessão do perfil (src/painel/api/sessoes.ts).
import { createContext, useContext, type ComponentType } from 'react'
import type { Perfil } from '../tipos'
import type { ArmazemDeSessao } from './api/sessao'

export interface TelaDoPainel {
  /** Pedaço da URL depois da base: 'reservas' → /loja/reservas. */
  caminho: string
  /** Nome na barra lateral. */
  rotulo: string
  Tela: ComponentType
  /**
   * Aviso discreto ao lado do título, como "Dados de demonstração" (as buscas da Demanda vêm do
   * seed) ou "Dados de exemplo" (a tela ainda responde com um mock).
   */
  selo?: string
}

export interface ConfigDoPainel {
  /** "Painel da loja": aparece na barra lateral e no título da aba. */
  nome: string
  /** Onde o painel está montado no App: "/loja". */
  base: string
  /** Só entra quem tem este perfil; sem a sessão dele, a guarda manda para /entrar. */
  perfil: Perfil
  /** Na ordem da barra lateral; a primeira é a tela inicial. */
  telas: readonly TelaDoPainel[]
  sessao: ArmazemDeSessao
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
