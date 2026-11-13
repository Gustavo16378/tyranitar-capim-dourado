import { useCallback, useState } from 'react'
import { paraErroApi, type ErroApi } from './http'

interface EstadoAcao<T> {
  enviando: boolean
  erro: ErroApi | null
  resultado: T | null
}

const PARADO = { enviando: false, erro: null, resultado: null }

/**
 * Envia algo para a API (registrar compra, mudar status, criar cupom) e guarda o estado:
 *
 *   const compra = useAcao(registrarCompra)
 *   <Button disabled={compra.enviando} onClick={() => compra.executar(pedido)}>Registrar</Button>
 *   {compra.erro && <Erro erro={compra.erro} />}
 *   {compra.resultado && <Recibo compra={compra.resultado} />}
 *
 * executar() nunca lança: devolve o resultado, ou null se deu erro (o erro fica em `erro`).
 */
export function useAcao<A extends unknown[], T>(acao: (...args: A) => Promise<T>) {
  const [estado, setEstado] = useState<EstadoAcao<T>>(PARADO)

  const executar = useCallback(
    async (...args: A): Promise<T | null> => {
      setEstado({ enviando: true, erro: null, resultado: null })
      try {
        const resultado = await acao(...args)
        setEstado({ enviando: false, erro: null, resultado })
        return resultado
      } catch (erro) {
        setEstado({ enviando: false, erro: paraErroApi(erro), resultado: null })
        return null
      }
    },
    [acao],
  )

  const limpar = useCallback(() => setEstado(PARADO), [])

  return { ...estado, executar, limpar }
}
