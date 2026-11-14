import { useEffect, useRef } from 'react'
import { Badge, Button, formatarNumero, formatarPreco, Icon } from '../../../componentes'
import { somarPontos, useGSAP } from '../../../movimento'
import type { Compra } from '../../../tipos/loja'
import { DescontosDoItem } from './ItensDaCompra'

interface ReciboProps {
  compra: Compra
  /** Primeiro nome do cliente. */
  cliente: string
  /** Para escrever o nome de cada cupom no desconto. */
  nomes: ReadonlyMap<string, string>
  /** Só reservas já pagas com Pix: foi uma retirada, sem cobrança no caixa. */
  retiradaPaga: boolean
  aoTerminar: () => void
}

/**
 * Resposta do POST /api/loja/compras: o que saiu, item por item com os descontos, quanto o
 * cliente pagou no caixa e os pontos somando (movimento 3 da marca).
 */
export function Recibo({ compra, cliente, nomes, retiradaPaga, aoTerminar }: ReciboProps) {
  const caixa = useRef<HTMLDivElement>(null)
  const numero = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (!numero.current) return
      const mm = somarPontos(numero.current, {
        ate: compra.pontosGerados,
        prefixo: '+',
        destaque: caixa.current,
      })
      return () => mm.revert()
    },
    { dependencies: [compra.pontosGerados] },
  )

  // O formulário sumiu: o foco vai para o recibo, para quem usa teclado não se perder.
  useEffect(() => caixa.current?.focus(), [])

  const registrada = retiradaPaga ? 'Retirada registrada.' : 'Compra registrada.'
  const jaPago = compra.valorPagoCentavos - compra.aPagarNoCaixaCentavos

  return (
    <div className="flex flex-col gap-4">
      <ul aria-label="Itens registrados" className="flex flex-col divide-y divide-line">
        {compra.itens.map((item, i) => (
          <li key={`${item.reservaId ?? item.produtoId ?? 'outros'}-${i}`} className="flex flex-col gap-1 py-2 first:pt-0">
            <div className="flex items-baseline justify-between gap-4 text-body-sm">
              <span className="min-w-0">
                <span className="font-semibold">{item.descricao}</span>
                {item.quantidade > 1 && <span className="text-ink-muted"> × {item.quantidade}</span>}
                {item.detalhe && <span className="text-ink-muted"> · {item.detalhe}</span>}
              </span>
              <span className="flex-none tabular-nums">{formatarPreco(item.pagoCentavos)}</span>
            </div>
            <DescontosDoItem descontos={item.descontos} nomes={nomes} />
            {item.jaPago && (
              <div>
                <Badge tone="cerrado" icon="check">
                  Já pago com Pix
                </Badge>
              </div>
            )}
          </li>
        ))}
      </ul>

      <dl className="flex flex-col gap-2 border-t border-line pt-3 text-body-sm">
        <Linha rotulo="Valor dos itens" valor={formatarPreco(compra.valorBrutoCentavos)} />
        {compra.descontos.map((d) => (
          <Linha key={d.cupom} rotulo={nomes.get(d.cupom) ?? 'Cupom'} valor={d.centavos ? `− ${formatarPreco(d.centavos)}` : 'brinde'} />
        ))}
        {jaPago > 0 && <Linha rotulo="Já pago com Pix" valor={`− ${formatarPreco(jaPago)}`} />}
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <dt className="text-label">Cliente pagou no caixa</dt>
          <dd className="text-price">{formatarPreco(compra.aPagarNoCaixaCentavos)}</dd>
        </div>
      </dl>

      <div
        ref={caixa}
        tabIndex={-1}
        className="flex flex-wrap items-center gap-2 rounded-md bg-cerrado-soft px-4 py-3 text-body-sm font-medium text-cerrado-ink focus:outline-none"
      >
        <Icon name="check" />
        <span aria-hidden="true">
          {registrada} {cliente} ganhou{' '}
          <strong ref={numero} className="tabular-nums">
            {`+${formatarNumero(compra.pontosGerados)}`}
          </strong>{' '}
          pontos.
        </span>
        {/* O número conta na tela; o leitor de tela ouve só o resultado, uma vez. */}
        <span role="status" className="sr-only">
          {`${registrada} ${cliente} ganhou ${compra.pontosGerados} pontos.`}
        </span>
        <Button size="sm" variant="ghost" onClick={aoTerminar}>
          Próximo cliente
        </Button>
      </div>

      {compra.reembolsoGerado && (
        <p className="text-body-sm text-ink-muted">
          O shopping reembolsa {formatarPreco(compra.reembolsoGerado.centavos)} do voucher para a loja.
        </p>
      )}
    </div>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-muted">{rotulo}</dt>
      <dd className="tabular-nums">{valor}</dd>
    </div>
  )
}
