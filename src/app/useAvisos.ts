import { useEffect, useSyncExternalStore } from 'react'
import { assinarAvisos, atualizarAvisos, avisosAtuais } from '../api'

/** Com o app aberto, os avisos são conferidos de tanto em tanto. */
export const INTERVALO_DOS_AVISOS_MS = 30_000

let quemUsa = 0
let relogio: number | undefined

const conferirSeVisivel = () => document.visibilityState === 'visible' && void atualizarAvisos()

/**
 * Os avisos do cliente (src/api/avisos.ts), conferidos enquanto alguma tela usa: na hora, a cada
 * 30 s e quando a aba volta a aparecer. Sem sessão de cliente, passe ativo = false.
 */
export function useAvisos(ativo: boolean) {
  const avisos = useSyncExternalStore(assinarAvisos, avisosAtuais, avisosAtuais)
  useEffect(() => {
    if (!ativo) return
    quemUsa++
    if (quemUsa === 1) {
      void atualizarAvisos()
      relogio = window.setInterval(conferirSeVisivel, INTERVALO_DOS_AVISOS_MS)
    }
    document.addEventListener('visibilitychange', conferirSeVisivel)
    return () => {
      document.removeEventListener('visibilitychange', conferirSeVisivel)
      quemUsa--
      if (quemUsa === 0) window.clearInterval(relogio)
    }
  }, [ativo])
  return ativo ? avisos : null
}
