// Extrato (RF25): o que a loja vendeu pela plataforma, o desconto de cada lado e o que o
// shopping deve à loja pelos vouchers usados aqui (RN11).
//
//   TelaExtrato           cabeçalho, filtro de período e GET /api/loja/extrato
//   └─ ConteudoDoExtrato  os quatro estados, os números do topo e a tabela das compras
import { useCallback, useState } from 'react'
import { Badge, formatarNumero, formatarPreco, StatTile } from '../../../componentes'
import { cx } from '../../../componentes/cx'
import { useEntrada } from '../../../movimento'
import type { Extrato, LancamentoDoExtrato, Periodo } from '../../../tipos/loja'
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
        <Vazio>Nenhuma compra pela plataforma neste período. Tente um período maior.</Vazio>
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
          <TabelaDeCompras lancamentos={lancamentos.itens} />
          <Paginacao pagina={pagina} tamanho={20} total={lancamentos.total} aoMudar={aoMudarPagina} />
        </section>
      )}
    </div>
  )
}

const DINHEIRO = 'whitespace-nowrap py-3 pl-4 text-right tabular-nums'

function TabelaDeCompras({ lancamentos }: { lancamentos: LancamentoDoExtrato[] }) {
  return (
    // Em tela estreita, a tabela rola de lado dentro do cartão; a página não.
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[760px] border-collapse text-left text-body-sm">
        <caption className="sr-only">Compras do período, da mais nova para a mais antiga</caption>
        <thead>
          <tr className="border-b border-line text-label">
            <th scope="col" className="py-2 pr-4">Data</th>
            <th scope="col" className="py-2 pr-4">Cliente</th>
            <th scope="col" className="py-2 pl-4 text-right">Valor</th>
            <th scope="col" className="py-2 pl-4 text-right">Cupom da loja</th>
            <th scope="col" className="py-2 pl-4 text-right">Voucher do shopping</th>
            <th scope="col" className="py-2 pl-4 text-right">Cliente pagou</th>
            <th scope="col" className="py-2 pl-4">Reembolso</th>
          </tr>
        </thead>
        <tbody>
          {lancamentos.map((l) => (
            <tr key={l.id} className="border-b border-line last:border-b-0">
              <td className="whitespace-nowrap py-3 pr-4 text-ink-muted">{formatarDataHora(l.criadoEm)}</td>
              <td className="py-3 pr-4">
                {l.cliente}
                {l.retirada && <span className="text-ink-muted"> · retirada</span>}
              </td>
              <td className={DINHEIRO}>{formatarPreco(l.brutoCentavos)}</td>
              <td className={cx(DINHEIRO, !l.descontoLojaCentavos && 'text-ink-muted')}>
                {l.descontoLojaCentavos ? `− ${formatarPreco(l.descontoLojaCentavos)}` : '—'}
              </td>
              <td className={cx(DINHEIRO, !l.descontoShoppingCentavos && 'text-ink-muted')}>
                {l.descontoShoppingCentavos ? `− ${formatarPreco(l.descontoShoppingCentavos)}` : '—'}
              </td>
              <td className={cx(DINHEIRO, 'font-semibold')}>{formatarPreco(l.pagoCentavos)}</td>
              <td className="py-3 pl-4">
                {l.reembolso ? (
                  l.reembolso.status === 'PAGO' ? (
                    <Badge tone="cerrado" icon="check">
                      Pago{l.reembolso.pagoEm ? ` em ${formatarData(l.reembolso.pagoEm)}` : ''}
                    </Badge>
                  ) : (
                    <Badge icon="relogio">A receber</Badge>
                  )
                ) : (
                  <span className="text-ink-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
