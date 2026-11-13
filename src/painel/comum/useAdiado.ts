import { useEffect, useState } from 'react'

/**
 * O valor só muda depois de ficar parado por `ms`: para buscar enquanto a pessoa digita
 * sem chamar a API a cada tecla. Use com texto ou número, não com objeto (um objeto novo
 * a cada render nunca para de mudar): para um pedido, passe JSON.stringify(pedido).
 */
export function useAdiado<T extends string | number | boolean | null>(valor: T, ms = 300): T {
  const [adiado, setAdiado] = useState(valor)
  useEffect(() => {
    const espera = setTimeout(() => setAdiado(valor), ms)
    return () => clearTimeout(espera)
  }, [valor, ms])
  return adiado
}
