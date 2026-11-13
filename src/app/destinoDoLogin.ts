// Para onde a tela de login (/entrar) segue depois de entrar: pelo perfil do token. O cliente
// vai para o Início (ou para a tela do app que pediu o login), o lojista para /loja e a
// administração para /shopping. Quem chega de um painel volta para a mesma tela dele.
import type { Perfil } from '../tipos'

export const INICIO_DO_PERFIL: Record<Perfil, string> = {
  CLIENTE: '/inicio',
  LOJISTA: '/loja',
  ADMIN_SHOPPING: '/shopping',
}

/** O que a guarda de uma tela manda junto para /entrar: de onde veio e o perfil que ela pede. */
export interface PedidoDeLogin {
  de?: string
  perfil?: Perfil
}

export function lerPedidoDeLogin(estado: unknown): PedidoDeLogin {
  if (typeof estado !== 'object' || estado === null) return {}
  const { de, perfil } = estado as Record<string, unknown>
  return {
    de: typeof de === 'string' && de.startsWith('/') && !de.startsWith('/entrar') ? de : undefined,
    perfil: perfil === 'CLIENTE' || perfil === 'LOJISTA' || perfil === 'ADMIN_SHOPPING' ? perfil : undefined,
  }
}

const dentroDe = (caminho: string, base: string) => caminho === base || caminho.startsWith(`${base}/`)

/** O destino de quem entrou com este perfil: a tela de onde veio, se for da área dele. */
export function destinoDoLogin(perfil: Perfil, pedido: PedidoDeLogin): string {
  const inicio = INICIO_DO_PERFIL[perfil]
  const { de } = pedido
  if (!de) return inicio
  const painel = ['/loja', '/shopping'].find((base) => dentroDe(de, base))
  if (perfil === 'CLIENTE') return painel ? inicio : de
  return dentroDe(de, inicio) ? de : inicio
}
