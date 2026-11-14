// O que o aviso de reserva nova (AvisoDeReservas) entrega às telas da loja: o número de pendentes,
// o som ligado ou não, e um jeito de pedir a conta de novo depois de confirmar ou recusar.
import { createContext, useContext } from 'react'

export interface AvisoDeReservasNovas {
  /** Quantas esperam a loja confirmar ou recusar; null antes da primeira resposta. */
  pendentes: number | null
  /** Sobe a cada vez que chega reserva nova: a lista de Reservas se atualiza sozinha. */
  chegadas: number
  som: boolean
  mudarSom: (ligado: boolean) => void
  /** Pergunta de novo agora (depois de uma ação, para o selo não esperar os 20 s). */
  recarregar: () => void
}

const SEM_AVISO: AvisoDeReservasNovas = {
  pendentes: null,
  chegadas: 0,
  som: false,
  mudarSom: () => {},
  recarregar: () => {},
}

export const ContextoDoAviso = createContext<AvisoDeReservasNovas>(SEM_AVISO)

export function useAvisoDeReservas() {
  return useContext(ContextoDoAviso)
}
