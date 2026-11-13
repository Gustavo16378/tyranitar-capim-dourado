import { useEffect, useState } from 'react'

/** A hora atual em ms, atualizada a cada `intervalo`: para prazos como "Expira em 40 min". */
export function useAgora(intervalo = 60_000) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), intervalo)
    return () => clearInterval(relogio)
  }, [intervalo])
  return agora
}
