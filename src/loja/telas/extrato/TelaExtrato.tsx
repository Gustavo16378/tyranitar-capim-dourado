// Extrato (RF25): o que a loja vendeu pela plataforma, o desconto de cada lado e o que o
// shopping deve à loja pelos vouchers usados aqui (RN11).
//
//   TelaExtrato           cabeçalho, filtro de período e GET /api/loja/extrato
//   └─ ConteudoDoExtrato  os quatro estados, os números do topo e as compras, cada uma com a
//                         cliente e os itens: em tabela a partir de 1024 px; abaixo disso, um
//                         cartão por compra
import { useCallback, useState } from 'react'
import { Badge, formatarNumero, formatarPreco, StatTile } from '../../../componentes'
import { cx } from '../../../componentes/cx'
import { useEntrada } from '../../../movimento'
import type { Extrato, ItemDoExtrato, LancamentoDoExtrato, Periodo } from '../../../tipos/loja'
import { buscarExtrato, useConsulta } from '../../api'
import { CabecalhoTela } from '../../../painel/comum/CabecalhoTela'
import { Carregando, Erro, Esqueleto, Vazio } from '../../../painel/comum/Estados'
import { formatarData, formatarDataHora } from '../../../painel/comum/formatos'
import { Paginacao } from '../../../painel/comum/Paginacao'
import { Segmentos } from '../../../painel/comum/Segmentos'
import { PERIODOS } from '../../../painel/comum/periodos'

export function TelaExtrato() {
  const ref = useEntrada<HTMLDivElement>()
  const [periodo, setPeriodo] = useState<Periodo>('30d')
  const [pagina, setPagina] = useState(1)

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela
        titulo="Extrato"
        descricao="O que a loja vendeu pela plataforma, o desconto de cada lado e o que o shopping deve à loja pelos vouchers usados aqui."
      />
      <div data-anim>
        <Segmentos
          rotulo="Período do extrato"
          opcoes={PERIODOS}
          valor={periodo}
          aoMudar={(novo) => {
            setPeriodo(novo)
            setPagina(1)
          }}
        />
      </div>
      <div data-anim>
        <ConteudoDoExtrato periodo={periodo} pagina={pagina} aoMudarPagina={setPagina} />
      </div>
    </div>
  )
}

interface ConteudoProps {
  periodo: Periodo
  pagina: number
  aoMudarPagina: (pagina: number) => void
}

function ConteudoDoExtrato({ periodo, pagina, aoMudarPagina }: ConteudoProps) {
  const buscar = useCallback((sinal: AbortSignal) => buscarExtrato(periodo, pagina, sinal), [periodo, pagina])
  const consulta = useConsulta(buscar)

  if (consulta.estado === 'carregando') {
    return (
      <Carregando rotulo="Carregando o extrato" className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3].map((i) => (
            <Esqueleto key={i} className="h-[124px] w-[220px]" />
          ))}
        </div>
        <Esqueleto className="h-[420px]" />
      </Carregando>
    )
  }
  if (consulta.estado === 'erro') {
    const { erro, recarregar } = consulta
    return <Erro erro={erro} aoTentarDeNovo={erro.passageiro ? recarregar : undefined} />
  }
  return (
    <ExtratoDoPeriodo
      extrato={consulta.dados}
      atualizando={consulta.atualizando}
      pagina={pagina}
      aoMudarPagina={aoMudarPagina}
    />
  )
}

function ExtratoDoPeriodo({
  extrato,
  atualizando,
  pagina,
  aoMudarPagina,
}: { extrato: Extrato; atualizando: boolean } & Omit<ConteudoProps, 'periodo'>) {
  const ref = useEntrada<HTMLDivElement>()
  const { resumo, reembolsos, lancamentos } = extrato

  return (
    <div
      ref={ref}
      aria-busy={atualizando}
      className={cx('flex flex-col gap-6 transition-opacity duration-rapida', atualizando && 'opacity-60')}
    >
      <div data-anim className="flex flex-wrap gap-3">
        <StatTile
          rotulo="Vendido pela plataforma"
          valor={formatarPreco(resumo.brutoCentavos)}
          nota={resumo.compras === 1 ? '1 compra' : `${formatarNumero(resumo.compras)} compras`}
        />
        <StatTile rotulo="Desconto dado pela loja" valor={formatarPreco(resumo.descontoLojaCentavos)} nota="em cupons da loja" />
        <StatTile
          rotulo="A receber do shopping"
          valor={formatarPreco(reembolsos.pendenteCentavos)}
          nota={
            reembolsos.pagoNoPeriodoCentavos
              ? `${formatarPreco(reembolsos.pagoNoPeriodoCentavos)} já pagos no período`
              : 'vouchers usados aqui'
          }
        />
      </div>

      {resumo.compras === 0 ? (
        <Vazio ilustracao="recibo">Nenhuma compra pela plataforma neste período. Tente um período maior.</Vazio>
      ) : (
        <section data-anim aria-labelledby="titulo-compras" className="flex flex-col gap-4 rounded-md border border-line bg-surface-raised p-5">
          <div className="flex flex-col gap-1">
            <h2 id="titulo-compras" className="text-title-sm">
              Compras do período
            </h2>
            <p className="text-body-sm text-ink-muted">
              Dos {formatarPreco(resumo.brutoCentavos)} vendidos, os clientes pagaram {formatarPreco(resumo.pagoCentavos)}, a
              loja deu {formatarPreco(resumo.descontoLojaCentavos)} em cupons e o shopping cobre{' '}
              {formatarPreco(resumo.descontoShoppingCentavos)} em vouchers.
            </p>
          </div>
          <CartoesDeCompras lancamentos={lancamentos.itens} />
          <TabelaDeCompras lancamentos={lancamentos.itens} />
          <Paginacao pagina={pagina} tamanho={20} total={lancamentos.total} aoMudar={aoMudarPagina} />
        </section>
      )}
    </div>
  )
}

const DINHEIRO = 'whitespace-nowrap py-3 pl-4 text-right tabular-nums'

/** O reembolso do voucher usado na compra: pago (com a data) ou a receber; sem voucher, nada. */
function Reembolso({ reembolso }: { reembolso: LancamentoDoExtrato['reembolso'] }) {
  if (!reembolso) return null
  return reembolso.status === 'PAGO' ? (
    <Badge tone="cerrado" icon="check">
      Pago{reembolso.pagoEm ? ` em ${formatarData(reembolso.pagoEm)}` : ''}
    </Badge>
  ) : (
    <Badge icon="relogio">A receber</Badge>
  )
}

/** Desconto com o sinal de menos; sem desconto, um traço apagado. */
function Desconto({ centavos }: { centavos: number }) {
  return centavos ? <>− {formatarPreco(centavos)}</> : <span className="text-ink-muted">—</span>
}

/** O que é o item, além do nome: saiu de uma reserva, já veio pago com Pix. */
function marcasDoItem(item: ItemDoExtrato) {
  return [item.retirada && 'reserva', item.jaPago && 'pago com Pix'].filter(Boolean).join(', ')
}

/**
 * Os itens de uma compra: quantidade, nome, o que ele é (reserva, pago com Pix), o valor e o
 * desconto que os cupons deram nele. Compra de antes dos itens não tem a lista.
 */
function ItensDoLancamento({ itens, cliente }: { itens: ItemDoExtrato[]; cliente: string }) {
  if (!itens?.length) return null
  return (
    <ul aria-label={`Itens da compra de ${cliente}`} className="flex flex-col gap-1 text-body-sm">
      {itens.map((item, i) => {
        const marcas = marcasDoItem(item)
        return (
          <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="min-w-0">
              {item.quantidade > 1 && <span className="tabular-nums">{item.quantidade} × </span>}
              {item.descricao}
              {marcas && <span className="text-ink-muted"> · {marcas}</span>}
            </span>
            <span className="whitespace-nowrap tabular-nums text-ink-muted">
              {formatarPreco(item.brutoCentavos)}
              {item.descontoCentavos > 0 && <> · − {formatarPreco(item.descontoCentavos)}</>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** Abaixo de 1024 px: um cartão por compra, com os itens e os valores um embaixo do outro. */
function CartoesDeCompras({ lancamentos }: { lancamentos: LancamentoDoExtrato[] }) {
  return (
    <ul aria-label="Compras do período, da mais nova para a mais antiga" className="flex flex-col gap-3 lg:hidden">
      {lancamentos.map((l) => (
        <li key={l.id} className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-label">
              {l.cliente}
              {l.retirada && <span className="font-normal text-ink-muted"> · retirada</span>}
            </p>
            <p className="text-body-sm text-ink-muted">{formatarDataHora(l.criadoEm)}</p>
          </div>
          <ItensDoLancamento itens={l.itens} cliente={l.cliente} />
          <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-body-sm">
            <dt className="text-ink-muted">Valor</dt>
            <dd className="text-right tabular-nums">{formatarPreco(l.brutoCentavos)}</dd>
            <dt className="text-ink-muted">Cupom da loja</dt>
            <dd className="text-right tabular-nums">
              <Desconto centavos={l.descontoLojaCentavos} />
            </dd>
            <dt className="text-ink-muted">Voucher do shopping</dt>
            <dd className="text-right tabular-nums">
              <Desconto centavos={l.descontoShoppingCentavos} />
            </dd>
            <dt className="font-semibold">Cliente pagou</dt>
            <dd className="text-right font-semibold tabular-nums">{formatarPreco(l.pagoCentavos)}</dd>
          </dl>
          {l.reembolso && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <span className="text-body-sm text-ink-muted">Reembolso do voucher</span>
              <Reembolso reembolso={l.reembolso} />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

/** A partir de 1024 px: a tabela, uma compra por linha. */
function TabelaDeCompras({ lancamentos }: { lancamentos: LancamentoDoExtrato[] }) {
  return (
    <div className="hidden lg:block">
      <table className="w-full border-collapse text-left text-body-sm">
        <caption className="sr-only">Compras do período, da mais nova para a mais antiga</caption>
        <thead>
          <tr className="border-b border-line text-label">
            <th scope="col" className="py-2 pr-4">Data</th>
            <th scope="col" className="py-2 pr-4">Cliente e itens</th>
            <th scope="col" className="py-2 pl-4 text-right">Valor</th>
            <th scope="col" className="py-2 pl-4 text-right">Cupom da loja</th>
            <th scope="col" className="py-2 pl-4 text-right">Voucher do shopping</th>
            <th scope="col" className="py-2 pl-4 text-right">Cliente pagou</th>
            <th scope="col" className="py-2 pl-4">Reembolso</th>
          </tr>
        </thead>
        <tbody>
          {lancamentos.map((l) => (
            <tr key={l.id} className="border-b border-line align-top last:border-b-0">
              <td className="whitespace-nowrap py-3 pr-4 text-ink-muted">{formatarDataHora(l.criadoEm)}</td>
              <td className="py-3 pr-4">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">
                    {l.cliente}
                    {l.retirada && <span className="font-normal text-ink-muted"> · retirada</span>}
                  </span>
                  <ItensDoLancamento itens={l.itens} cliente={l.cliente} />
                </div>
              </td>
              <td className={DINHEIRO}>{formatarPreco(l.brutoCentavos)}</td>
              <td className={DINHEIRO}>
                <Desconto centavos={l.descontoLojaCentavos} />
              </td>
              <td className={DINHEIRO}>
                <Desconto centavos={l.descontoShoppingCentavos} />
              </td>
              <td className={cx(DINHEIRO, 'font-semibold')}>{formatarPreco(l.pagoCentavos)}</td>
              <td className="py-3 pl-4">
                {l.reembolso ? <Reembolso reembolso={l.reembolso} /> : <span className="text-ink-muted">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
