import { Badge, CupomTicket, formatarNumero, formatarPreco } from '../../componentes'
import { cx } from '../../componentes/cx'
import type { CupomComUso } from '../../tipos/painel'
import { formatarDia, paraNivel } from '../comum/formatos'
import { cupomValendo, situacaoDoCupom, textoDoDesconto, textoDoAlvo } from './textos'

interface CartaoCupomProps {
  cupom: CupomComUso
  /** 'loja': cupom de uma loja; 'shopping': voucher que vale em qualquer loja. */
  origem: 'loja' | 'shopping'
  /** Hoje em Palmas ("2026-11-13"), para a situação: vencido, vence em N dias. */
  hoje: string
}

/**
 * Um cupom como o cliente vê na carteira (CupomTicket) e, embaixo, o uso dele: quantas
 * vezes, quanto deu de desconto (na loja) ou quanto o shopping devolve às lojas (voucher).
 */
export function CartaoCupom({ cupom, origem, hoje }: CartaoCupomProps) {
  const situacao = situacaoDoCupom(cupom, hoje)
  const uso =
    cupom.usos === 0 ? 'Ainda não usado' : `Usado ${cupom.usos === 1 ? '1 vez' : `${formatarNumero(cupom.usos)} vezes`}`
  const valorUsado =
    cupom.descontoCentavos > 0
      ? ` · ${formatarPreco(cupom.descontoCentavos)} ${origem === 'loja' ? 'de desconto' : 'devolvidos às lojas'}`
      : ''
  return (
    <div className={cx('flex flex-col gap-3', !cupomValendo(cupom, hoje) && 'opacity-70')}>
      <CupomTicket
        origem={origem}
        titulo={cupom.titulo}
        loja={textoDoAlvo(cupom.categoriaAlvo)}
        desconto={textoDoDesconto(cupom)}
        validade={formatarDia(cupom.validade)}
        nivel={cupom.nivelMinimo === 'SEMENTE' ? undefined : paraNivel(cupom.nivelMinimo)}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-body-sm text-ink-muted">
          {uso}
          {valorUsado} · até {cupom.limitePorCliente} por cliente
        </p>
        {situacao && (
          <Badge tone={situacao.tom} icon={situacao.icone}>
            {situacao.texto}
          </Badge>
        )}
      </div>
    </div>
  )
}
