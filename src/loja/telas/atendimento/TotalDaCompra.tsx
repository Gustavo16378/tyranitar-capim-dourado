import { useCallback } from 'react'
import { Button, formatarNumero, formatarPreco, Icon } from '../../../componentes'
import { cx } from '../../../componentes/cx'
import type { PedidoCompra } from '../../../tipos/loja'
import { calcularPrevia, useConsulta } from '../../api'
import { useAdiado } from '../../comum/useAdiado'

interface TotalDaCompraProps {
  /** null enquanto o valor digitado não é válido. */
  pedido: PedidoCompra | null
  /** Primeiro nome do cliente. */
  cliente: string
  reservaPaga: boolean
}

/**
 * "Cliente paga", antes de registrar: a API calcula os descontos e os pontos
 * (POST /api/loja/atendimento/previa) assim que o caixa para de digitar ou troca um cupom.
 * Enquanto recalcula, o total anterior fica mais claro na tela.
 */
export function TotalDaCompra({ pedido, cliente, reservaPaga }: TotalDaCompraProps) {
  const chaveAgora = pedido ? JSON.stringify(pedido) : null
  const chave = useAdiado(chaveAgora)
  const buscar = useCallback(
    (sinal: AbortSignal) => (chave ? calcularPrevia(JSON.parse(chave) as PedidoCompra, sinal) : Promise.resolve(null)),
    [chave],
  )
  const consulta = useConsulta(buscar)
  const recalculando = chave !== chaveAgora || (consulta.estado === 'pronto' && consulta.atualizando)
  const previa = consulta.estado === 'pronto' && chaveAgora ? consulta.dados : null

  let nota = 'Digite o valor da compra.'
  if (previa) {
    const desconto = previa.descontos.reduce((soma, d) => soma + d.centavos, 0)
    const pontos = `${cliente} ganha ${formatarNumero(previa.pontosGerados)} ${previa.pontosGerados === 1 ? 'ponto' : 'pontos'}`
    nota = desconto > 0 ? `Desconto de ${formatarPreco(desconto)} · ${pontos}` : pontos
  } else if (chaveAgora && consulta.estado !== 'erro') {
    nota = 'Calculando…'
  }

  return (
    <div className="flex flex-col gap-1 border-t border-line pt-4">
      <div aria-live="polite" aria-busy={recalculando} className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-label">{reservaPaga ? 'Já pago com Pix' : 'Cliente paga'}</span>
          <strong
            className={cx(
              'text-price transition-opacity duration-rapida',
              (recalculando || !previa) && 'opacity-50',
            )}
          >
            {previa ? formatarPreco(previa.valorPagoCentavos) : '—'}
          </strong>
        </div>
        {consulta.estado !== 'erro' && <p className="text-body-sm text-ink-muted">{nota}</p>}
      </div>

      {consulta.estado === 'erro' && chaveAgora && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-body-sm text-perigo-ink">
          <Icon name="alerta" />
          <span>{consulta.erro.mensagem}</span>
          {consulta.erro.passageiro && (
            <Button size="sm" variant="ghost" onClick={consulta.recarregar}>
              Tentar de novo
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
