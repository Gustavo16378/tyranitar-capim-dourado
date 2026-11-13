// Lojas vagas e demanda: o que os clientes procuram e não acham em nenhuma loja, cruzado com
// as lojas vagas da planta. Mostra que tipo de loja o shopping deveria buscar para cada vaga
// e quanto da procura sem resposta passaria a ter loja. É o argumento para o comercial do
// shopping (e para o pitch).
//
//   TelaVagas           cabeçalho, filtro de período e GET /api/shopping/vagas
//   └─ Cruzamento       os números, a frase do argumento, a planta (quando o projeto tiver as
//      │                plantas de src/mapa), um cartão por vaga e a demanda por categoria
//      ├─ PlantaDasVagas
//      └─ CartaoVaga
import { useCallback, useState } from 'react'
import { formatarNumero, StatTile } from '../../../componentes'
import { cx } from '../../../componentes/cx'
import { useEntrada } from '../../../movimento'
import { CabecalhoTela } from '../../../painel/comum/CabecalhoTela'
import { rotuloDaCategoria } from '../../../painel/comum/categorias'
import { Carregando, Erro, Esqueleto, Vazio } from '../../../painel/comum/Estados'
import { formatarArea } from '../../../painel/comum/formatos'
import { PERIODOS } from '../../../painel/comum/periodos'
import { Segmentos } from '../../../painel/comum/Segmentos'
import { CartaoGrafico } from '../../../painel/graficos/CartaoGrafico'
import { GraficoRanking } from '../../../painel/graficos/GraficoRanking'
import type { Periodo, VagasEDemanda } from '../../../tipos/shopping'
import { buscarVagas, useConsulta } from '../../api'
import { CartaoVaga } from './CartaoVaga'

export function TelaVagas() {
  const ref = useEntrada<HTMLDivElement>()
  const [periodo, setPeriodo] = useState<Periodo>('30d')
  const buscar = useCallback((sinal: AbortSignal) => buscarVagas(periodo, sinal), [periodo])
  const consulta = useConsulta(buscar)

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela
        titulo="Lojas vagas e demanda"
        descricao="O que os clientes procuram no app e não acham em nenhuma loja, cruzado com as lojas vagas da planta: que tipo de loja buscar para cada vaga."
      />
      <div data-anim>
        <Segmentos rotulo="Período da demanda" opcoes={PERIODOS} valor={periodo} aoMudar={setPeriodo} />
      </div>
      <div data-anim>
        {consulta.estado === 'carregando' && (
          <Carregando rotulo="Cruzando as vagas com a demanda" className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3].map((i) => (
                <Esqueleto key={i} className="h-[124px] w-[200px]" />
              ))}
            </div>
            <Esqueleto className="h-24" />
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Esqueleto key={i} className="h-[300px]" />
              ))}
            </div>
          </Carregando>
        )}
        {consulta.estado === 'erro' && (
          <Erro erro={consulta.erro} aoTentarDeNovo={consulta.erro.passageiro ? consulta.recarregar : undefined} />
        )}
        {consulta.estado === 'pronto' && <Cruzamento dados={consulta.dados} atualizando={consulta.atualizando} />}
      </div>
    </div>
  )
}

function Cruzamento({ dados, atualizando }: { dados: VagasEDemanda; atualizando: boolean }) {
  const ref = useEntrada<HTMLDivElement>()
  const { resumo, vagas, demanda } = dados
  const noPeriodo = `em ${PERIODOS.find((p) => p.valor === dados.periodo)?.rotulo ?? dados.periodo}`

  if (resumo.vagas === 0) {
    return <Vazio>O shopping não tem lojas vagas agora. Quando uma unidade ficar vaga, ela aparece aqui com a sugestão.</Vazio>
  }

  const cobertura = resumo.buscasSemResultado ? Math.round((resumo.buscasComVaga / resumo.buscasSemResultado) * 100) : 0
  const primeira = vagas[0]?.sugestao ? vagas[0] : null
  const semVaga = demanda.filter((d) => d.motivoSemVaga)
  const unidadesDe = (mapaIds: string[]) => mapaIds.map((id) => vagas.find((v) => v.mapaId === id)?.unidade ?? id)

  return (
    <div
      ref={ref}
      aria-busy={atualizando}
      className={cx('flex flex-col gap-8 transition-opacity duration-rapida', atualizando && 'opacity-60')}
    >
      <div data-anim className="flex flex-wrap items-start gap-3">
        <StatTile rotulo="Lojas vagas" valor={formatarNumero(resumo.vagas)} nota={`${formatarArea(resumo.areaTotalM2)} na planta`} />
        <StatTile
          rotulo="Buscas sem resultado"
          valor={formatarNumero(resumo.buscasSemResultado)}
          nota={`${noPeriodo}, em nenhuma loja`}
        />
        <StatTile
          rotulo="Cabem nas vagas"
          valor={`${cobertura}%`}
          nota={`${formatarNumero(resumo.buscasComVaga)} buscas teriam loja`}
        />
      </div>

      {resumo.buscasComVaga > 0 && (
        <section data-anim aria-label="O argumento" className="flex flex-col gap-2 rounded-md bg-ouro-soft p-5 md:p-6">
          <p className="text-title-md text-ink">
            Com as {formatarNumero(resumo.vagas)} vagas ocupadas como sugerido, {cobertura}% do que os clientes
            procuraram e não acharam {noPeriodo} passa a ter loja no shopping.
          </p>
          {primeira?.sugestao && (
            <p className="text-body text-ink">
              O que mais falta é {rotuloDaCategoria(primeira.sugestao.categoria)}: {formatarNumero(primeira.sugestao.buscas)}{' '}
              buscas sem resultado. A {primeira.unidade}
              {primeira.areaM2 ? `, de ${formatarArea(primeira.areaM2)},` : ''} tem o tamanho para essa loja.
            </p>
          )}
        </section>
      )}

      <section aria-labelledby="titulo-vagas" className="flex flex-col gap-4">
        <h2 data-anim id="titulo-vagas" className="text-title-sm">
          As vagas e o que buscar para cada uma
        </h2>
        <ul className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vagas.map((vaga) => (
            <li key={vaga.id} data-anim>
              <CartaoVaga vaga={vaga} noPeriodo={noPeriodo} />
            </li>
          ))}
        </ul>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div data-anim className="min-w-0">
          <CartaoGrafico
            titulo="Demanda sem resultado, por categoria"
            descricao="Em ouro, as categorias que ganharam vaga na sugestão; no fundo, as que ficaram sem."
            tabela={{
              colunas: ['Categoria', 'Buscas', 'Vagas sugeridas'],
              linhas: demanda.map((d) => [
                rotuloDaCategoria(d.categoria),
                formatarNumero(d.buscas),
                d.vagas.length ? unidadesDe(d.vagas).join(', ') : 'nenhuma',
              ]),
            }}
          >
            <GraficoRanking
              linhas={demanda.map((d) => ({
                rotulo: rotuloDaCategoria(d.categoria),
                valor: d.buscas,
                destaque: d.vagas.length > 0,
                detalhe: d.vagas.length ? `Vaga: ${unidadesDe(d.vagas).join(', ')}` : (d.motivoSemVaga ?? undefined),
              }))}
              formatarValor={(n) => `${formatarNumero(n)} buscas sem resultado`}
              legenda={{ destaque: 'Ganhou vaga sugerida', contexto: 'Ficou sem vaga' }}
            />
          </CartaoGrafico>
        </div>

        <section data-anim aria-labelledby="titulo-sem-vaga" className="flex flex-col gap-3 rounded-md border border-line bg-surface-raised p-5">
          <h2 id="titulo-sem-vaga" className="text-title-sm">
            Procura que fica sem vaga
          </h2>
          {semVaga.length === 0 ? (
            <p className="text-body-sm text-ink-muted">Toda categoria procurada ganhou uma vaga na sugestão.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {semVaga.map((d) => (
                <li key={d.categoria} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                  <p className="flex flex-wrap justify-between gap-2">
                    <span className="text-label">{rotuloDaCategoria(d.categoria)}</span>
                    <span className="text-body-sm tabular-nums text-ink-muted">{formatarNumero(d.buscas)} buscas</span>
                  </p>
                  <p className="text-body-sm text-ink-muted">{d.motivoSemVaga}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-line pt-3 text-body-sm text-ink-muted">
            A sugestão usa o tamanho típico de cada tipo de loja e o piso: no 2º piso, só alimentação.
          </p>
        </section>
      </div>
    </div>
  )
}
