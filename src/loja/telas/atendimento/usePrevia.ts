import { useCallback } from 'react'
import type { PedidoCompra, PreviaCompra } from '../../../tipos/loja'
import { calcularPrevia, useConsulta, type ErroApi } from '../../api'
import { useAdiado } from '../../../painel/comum/useAdiado'

export interface Previa {
  /** A compra calculada pela API; null sem itens ou antes da primeira resposta. Pode ser do carrinho anterior: veja `recalculando`. */
  previa: PreviaCompra | null
  /** O carrinho mudou e a prévia nova ainda não chegou: os números na tela ficam mais claros. */
  recalculando: boolean
  erro: ErroApi | null
  recarregar: () => void
}

/**
 * A prévia da compra (POST /api/loja/compras/previa): o desconto de cada cupom em cada item, o
 * que o cliente paga e os pontos, sem gravar nada. Pergunta quando o caixa para de mexer no
 * carrinho por um instante (o pedido passa pelo useAdiado como texto).
 */
export function usePrevia(pedido: PedidoCompra | null): Previa {
  const chaveAgora = pedido ? JSON.stringify(pedido) : null
  const chave = useAdiado(chaveAgora)
  const buscar = useCallback(
    (sinal: AbortSignal) => (chave ? calcularPrevia(JSON.parse(chave) as PedidoCompra, sinal) : Promise.resolve(null)),
    [chave],
  )
  const consulta = useConsulta(buscar)
  const pronta = consulta.estado === 'pronto'
  return {
    previa: pronta && chaveAgora ? consulta.dados : null,
    recalculando: chave !== chaveAgora || (pronta && consulta.atualizando),
    erro: consulta.estado === 'erro' && chaveAgora ? consulta.erro : null,
    recarregar: consulta.recarregar,
  }
}
