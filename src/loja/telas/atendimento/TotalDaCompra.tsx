import { Button, formatarNumero, formatarPreco, Icon } from '../../../componentes'
import { cx } from '../../../componentes/cx'
import type { PreviaCompra } from '../../../tipos/loja'
import type { ErroApi } from '../../api'

interface TotalDaCompraProps {
  /** A prévia da API (usePrevia); null sem itens ou antes da primeira resposta. */
  previa: PreviaCompra | null
  recalculando: boolean
  erro: ErroApi | null
  aoTentarDeNovo: () => void
  /** A compra não tem itens ainda. */
  vazia: boolean
  /** Primeiro nome do cliente. */
  cliente: string
  /** O nome de cada cupom, pelo id. */
  nomes: ReadonlyMap<string, string>
}

/**
 * O total antes de registrar, calculado pela API (POST /api/loja/compras/previa): o valor dos
 * itens, o desconto de cada cupom, o que já foi pago com Pix e o que o cliente paga no caixa, com
 * os pontos que ele ganha. Enquanto recalcula, o total anterior fica mais claro na tela.
 */
export function TotalDaCompra({ previa, recalculando, erro, aoTentarDeNovo, vazia, cliente, nomes }: TotalDaCompraProps) {
  const jaPago = previa ? previa.valorPagoCentavos - previa.aPagarNoCaixaCentavos : 0

  let nota = 'Ponha um item na compra.'
  if (previa) {
    nota = `${cliente} ganha ${formatarNumero(previa.pontosGerados)} ${previa.pontosGerados === 1 ? 'ponto' : 'pontos'}`
  } else if (!vazia) {
    nota = 'Calculando…'
  }

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      {previa && (
        <dl className={cx('flex flex-col gap-1 text-body-sm transition-opacity duration-rapida', recalculando && 'opacity-60')}>
          <Linha rotulo="Valor dos itens" valor={formatarPreco(previa.valorBrutoCentavos)} />
          {previa.descontos.map((d) => (
            <Linha
              key={d.cupom}
              rotulo={nomes.get(d.cupom) ?? 'Cupom'}
              valor={d.centavos ? `− ${formatarPreco(d.centavos)}` : 'brinde'}
            />
          ))}
          {jaPago > 0 && <Linha rotulo="Já pago com Pix" valor={`− ${formatarPreco(jaPago)}`} />}
        </dl>
      )}

      <div aria-live="polite" aria-busy={recalculando} className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-label">Cliente paga</span>
          <strong
            className={cx(
              'text-price transition-opacity duration-rapida',
              !previa && 'text-ink-muted',
              previa && recalculando && 'opacity-60',
            )}
          >
            {previa ? formatarPreco(previa.aPagarNoCaixaCentavos) : '—'}
          </strong>
        </div>
        {!erro && <p className="text-body-sm text-ink-muted">{nota}</p>}
      </div>

      {erro && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-body-sm text-perigo-ink">
          <Icon name="alerta" />
          <span>{erro.mensagem}</span>
          {erro.passageiro && (
            <Button size="sm" variant="ghost" onClick={aoTentarDeNovo}>
              Tentar de novo
            </Button>
          )}
        </div>
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
