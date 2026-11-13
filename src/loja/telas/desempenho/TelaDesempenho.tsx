// Desempenho (RF24): o que vende, o que os clientes procuram e não acham, e quantas
// reservas viram retirada. Gráficos com recharts; a tela é carregada sob demanda (veja
// navegacao.ts), para o recharts não pesar nas outras telas.
//
//   TelaDesempenho      cabeçalho, filtro de período e GET /api/loja/relatorios
//   └─ Relatorio        números do topo (StatTile) e os três gráficos
//      ├─ GraficoRanking     mais vendidos; buscado e não encontrado
//      └─ BarraDasReservas   reservas que viraram retirada
import { useCallback, useState } from 'react'
import { formatarNumero, formatarPreco, StatTile } from '../../../componentes'
import { cx } from '../../../componentes/cx'
import { useEntrada } from '../../../movimento'
import type { Periodo, Relatorio as DadosDoRelatorio } from '../../../tipos/loja'
import { buscarRelatorio, useConsulta } from '../../api'
import { CabecalhoTela } from '../../comum/CabecalhoTela'
import { Carregando, Erro, Esqueleto, Vazio } from '../../comum/Estados'
import { Segmentos } from '../../comum/Segmentos'
import { BarraDasReservas } from './BarraDasReservas'
import { CartaoGrafico } from './CartaoGrafico'
import { partesDasReservas, porcentagem } from './contas'
import { GraficoRanking } from './GraficoRanking'

const PERIODOS: readonly { valor: Periodo; rotulo: string }[] = [
  { valor: '7d', rotulo: '7 dias' },
  { valor: '30d', rotulo: '30 dias' },
  { valor: '90d', rotulo: '90 dias' },
]

export function TelaDesempenho() {
  const ref = useEntrada<HTMLDivElement>()
  const [periodo, setPeriodo] = useState<Periodo>('30d')
  const buscar = useCallback((sinal: AbortSignal) => buscarRelatorio(periodo, sinal), [periodo])
  const consulta = useConsulta(buscar)

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela
        titulo="Desempenho"
        descricao="O que a loja vende, o que os clientes procuram e não acham, e quantas reservas viram retirada."
      />
      {/* O filtro fica numa linha acima de tudo o que ele muda. */}
      <div data-anim>
        <Segmentos rotulo="Período do relatório" opcoes={PERIODOS} valor={periodo} aoMudar={setPeriodo} />
      </div>
      <div data-anim>
        {consulta.estado === 'carregando' && <EsqueletoDoRelatorio />}
        {consulta.estado === 'erro' && (
          <Erro erro={consulta.erro} aoTentarDeNovo={consulta.erro.passageiro ? consulta.recarregar : undefined} />
        )}
        {consulta.estado === 'pronto' && <Relatorio relatorio={consulta.dados} atualizando={consulta.atualizando} />}
      </div>
    </div>
  )
}

function EsqueletoDoRelatorio() {
  return (
    <Carregando rotulo="Carregando o relatório" className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        {[1, 2, 3].map((i) => (
          <Esqueleto key={i} className="h-[124px] w-[200px]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Esqueleto className="h-[320px]" />
        <Esqueleto className="h-[320px]" />
      </div>
      <Esqueleto className="h-[180px]" />
    </Carregando>
  )
}

/**
 * Com dados. Ao trocar o período, o relatório anterior fica na tela, mais claro, até o
 * novo chegar: sem esqueleto e sem a página pular.
 */
function Relatorio({ relatorio, atualizando }: { relatorio: DadosDoRelatorio; atualizando: boolean }) {
  const ref = useEntrada<HTMLDivElement>()
  const { maisVendidos, naoEncontrados, reservas, ticketMedio } = relatorio

  if (!maisVendidos.length && !naoEncontrados.length && !reservas.feitas) {
    return <Vazio>Ainda não há vendas, buscas nem reservas neste período. Tente um período maior.</Vazio>
  }

  const conversao = porcentagem(reservas.retiradas, reservas.feitas)
  const { comFichaCentavos: comFicha, semFichaCentavos: semFicha } = ticketMedio
  const ganhoDaFicha = comFicha && semFicha ? Math.round((comFicha / semFicha - 1) * 100) : null
  const faltou = naoEncontrados[0]
  const partes = partesDasReservas(reservas)

  return (
    <div
      ref={ref}
      aria-busy={atualizando}
      className={cx('flex flex-col gap-6 transition-opacity duration-rapida', atualizando && 'opacity-60')}
    >
      <div data-anim className="flex flex-wrap gap-3">
        <StatTile
          rotulo="Reservas retiradas"
          valor={`${conversao}%`}
          nota={`${formatarNumero(reservas.retiradas)} de ${formatarNumero(reservas.feitas)} reservas`}
        />
        <StatTile
          rotulo="Ticket médio com ficha"
          valor={comFicha ? formatarPreco(comFicha) : '—'}
          variacao={ganhoDaFicha === null ? undefined : `${ganhoDaFicha >= 0 ? '+' : '-'}${Math.abs(ganhoDaFicha)}%`}
          nota={semFicha ? `que sem ficha (${formatarPreco(semFicha)})` : 'sem compras sem ficha'}
        />
        <StatTile
          rotulo="Buscado e não achado"
          valor={faltou ? formatarNumero(faltou.buscas) : '0'}
          nota={faltou ? faltou.termo : 'nada faltou no período'}
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div data-anim className="min-w-0">
          <CartaoGrafico
            titulo="Mais vendidos"
            descricao="Unidades vendidas no período, pela plataforma."
            tabela={{
              colunas: ['Produto', 'Unidades', 'Valor'],
              linhas: maisVendidos.map((p) => [p.nome, formatarNumero(p.quantidade), formatarPreco(p.valorCentavos)]),
            }}
          >
            {maisVendidos.length ? (
              <GraficoRanking
                linhas={maisVendidos.map((p) => ({
                  rotulo: p.nome,
                  valor: p.quantidade,
                  detalhe: `${formatarPreco(p.valorCentavos)} vendidos`,
                }))}
                formatarValor={(n) => `${formatarNumero(n)} ${n === 1 ? 'unidade' : 'unidades'}`}
              />
            ) : (
              <Vazio>Nenhuma venda neste período.</Vazio>
            )}
          </CartaoGrafico>
        </div>

        <div data-anim className="min-w-0">
          <CartaoGrafico
            titulo="Buscado e não encontrado"
            descricao="O que os clientes buscaram nas categorias da loja e não acharam em nenhuma loja do shopping."
            tabela={{
              colunas: ['Busca', 'Vezes'],
              linhas: naoEncontrados.map((b) => [b.termo, formatarNumero(b.buscas)]),
            }}
          >
            {naoEncontrados.length ? (
              <GraficoRanking
                linhas={naoEncontrados.map((b) => ({ rotulo: b.termo, valor: b.buscas }))}
                formatarValor={(n) => `${formatarNumero(n)} ${n === 1 ? 'busca' : 'buscas'}`}
              />
            ) : (
              <Vazio>Nenhuma busca ficou sem resposta neste período.</Vazio>
            )}
          </CartaoGrafico>
        </div>
      </div>

      <div data-anim>
        <CartaoGrafico
          titulo="Reservas que viraram retirada"
          descricao={`${formatarNumero(reservas.retiradas)} das ${formatarNumero(reservas.feitas)} reservas do período foram retiradas no balcão.`}
          tabela={{
            colunas: ['Reservas', 'Quantidade', 'Parte'],
            linhas: [
              ['Retiradas', reservas.retiradas],
              ['Em aberto', reservas.emAberto],
              ['Canceladas', reservas.canceladas],
              ['Expiradas', reservas.expiradas],
            ].map(([nome, n]) => [
              nome,
              formatarNumero(Number(n)),
              `${porcentagem(Number(n), reservas.feitas)}%`,
            ]),
          }}
        >
          {reservas.feitas ? (
            <BarraDasReservas reservas={reservas} />
          ) : (
            <Vazio>Nenhuma reserva neste período.</Vazio>
          )}
          <span className="sr-only">
            {`Retiradas ${partes.retiradas}, em aberto ${partes.emAberto}, canceladas ou expiradas ${partes.perdidas}.`}
          </span>
        </CartaoGrafico>
      </div>
    </div>
  )
}
