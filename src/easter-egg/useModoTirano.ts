import { useSyncExternalStore } from 'react'
import { modoTirano } from './modoTirano'

/** O estado do modo tirano (modoTirano.ts). Toda tela que lê redesenha quando ele muda. */
export function useModoTirano() {
  return useSyncExternalStore(modoTirano.assinar, modoTirano.estado, modoTirano.estado)
}
