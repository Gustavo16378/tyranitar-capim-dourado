// Os selos com número ao lado de uma tela na barra lateral (e no botão Menu, no celular), como as
// reservas novas da loja. Quem conta é o Vigia do painel (ConfigDoPainel.Vigia), que fica por volta
// das telas e entrega os números por este contexto; o LayoutPainel só desenha. Painel sem Vigia
// (o do shopping) não tem selo.
import { createContext, useContext } from 'react'

export interface Contador {
  quantidade: number
  /** O que o número quer dizer, para o leitor de tela: "2 reservas novas". */
  rotulo: string
  /** Sobe a cada vez que chega algo novo: o selo dá um pulo (sem pulo com movimento reduzido). */
  chegadas?: number
}

/** Pelo caminho da tela: { reservas: { quantidade: 2, rotulo: '2 reservas novas' } }. */
export type Contadores = Readonly<Partial<Record<string, Contador>>>

export const ContextoDosContadores = createContext<Contadores>({})

export function useContadores() {
  return useContext(ContextoDosContadores)
}

/** O número escrito no selo: até 99, depois "99+", para o selo não crescer. */
export function numeroDoSelo(quantidade: number) {
  return quantidade > 99 ? '99+' : String(quantidade)
}
