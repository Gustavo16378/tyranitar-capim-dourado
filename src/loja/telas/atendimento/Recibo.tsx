import { useEffect, useRef } from 'react'
import { Button, formatarNumero, formatarPreco, Icon } from '../../../componentes'
import { somarPontos, useGSAP } from '../../../movimento'
import type { Compra, CupomDoCliente } from '../../../tipos/loja'

interface ReciboProps {
  compra: Compra
  /** Primeiro nome do cliente. */
  cliente: string
  /** Para escrever o nome de cada cupom no desconto. */
  cupons: CupomDoCliente[]
  retiradaPaga: boolean
  aoTerminar: () => void
}

/** Resposta do POST /api/loja/compras: quanto cobrar e os pontos somando (movimento 3 da marca). */
export function Recibo({ compra, cliente, cupons, retiradaPaga, aoTerminar }: ReciboProps) {
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

  const nomeDoCupom = (id: string) => cupons.find((c) => c.id === id)?.titulo ?? 'Cupom'
  const registrada = retiradaPaga ? 'Retirada registrada.' : 'Compra registrada.'

  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col gap-2 text-body-sm">
        <Linha rotulo="Valor da compra" valor={formatarPreco(compra.valorBrutoCentavos)} />
        {compra.descontos.map((d) => (
          <Linha key={d.cupom} rotulo={nomeDoCupom(d.cupom)} valor={`− ${formatarPreco(d.centavos)}`} />
        ))}
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <dt className="text-label">{retiradaPaga ? 'Pago com Pix' : 'Cliente paga'}</dt>
          <dd className="text-price">{formatarPreco(compra.valorPagoCentavos)}</dd>
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
