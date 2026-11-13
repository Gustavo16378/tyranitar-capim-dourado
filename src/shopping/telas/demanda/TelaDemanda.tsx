// Demanda (RF29): o que os clientes procuram e não acham em nenhuma loja do shopping, por
// categoria, sem identificar ninguém (RN12). A tela "Lojas vagas e demanda" cruza esta mesma
// demanda com as vagas da planta.
//
//   TelaDemanda     cabeçalho, filtro de período e GET /api/shopping/demanda
//   └─ Relatorio    números do topo e dois rankings (GraficoRanking de painel/graficos)
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, formatarNumero, StatTile } from '../../../componentes'
import { cx } from '../../../componentes/cx'
import { useEntrada } from '../../../movimento'
import { CabecalhoTela } from '../../../painel/comum/CabecalhoTela'
import { rotuloDaCategoria } from '../../../painel/comum/categorias'
import { Carregando, Erro, Esqueleto, Vazio } from '../../../painel/comum/Estados'
import { Segmentos } from '../../../painel/comum/Segmentos'
import { PERIODOS } from '../../../painel/comum/periodos'
import { CartaoGrafico } from '../../../painel/graficos/CartaoGrafico'
import { GraficoRanking } from '../../../painel/graficos/GraficoRanking'
import type { Demanda, Periodo } from '../../../tipos/shopping'
import { buscarDemanda, useConsulta } from '../../api'
import { urlDaTela } from '../../enderecos'

const buscas = (n: number) => `${formatarNumero(n)} ${n === 1 ? 'busca' : 'buscas'}`

export function TelaDemanda() {
  const ref = useEntrada<HTMLDivElement>()
  const [periodo, setPeriodo] = useState<Periodo>('30d')
  const buscar = useCallback((sinal: AbortSignal) => buscarDemanda(periodo, sinal), [periodo])
  const consulta = useConsulta(buscar)

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela
        titulo="Demanda"
        descricao="O que os clientes procuram no app e não acham em nenhuma loja do shopping. Ninguém é identificado: são buscas somadas."
      />
      <div data-anim>
        <Segmentos rotulo="Período da demanda" opcoes={PERIODOS} valor={periodo} aoMudar={setPeriodo} />
      </div>
      <div data-anim>
        {consulta.estado === 'carregando' && (
          <Carregando rotulo="Carregando a demanda" className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3].map((i) => (
                <Esqueleto key={i} className="h-[124px] w-[200px]" />
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Esqueleto className="h-[560px]" />
              <Esqueleto className="h-[400px]" />
            </div>
          </Carregando>
        )}
        {consulta.estado === 'erro' && (
          <Erro erro={consulta.erro} aoTentarDeNovo={consulta.erro.passageiro ? consulta.recarregar : undefined} />
        )}
        {consulta.estado === 'pronto' && <Relatorio demanda={consulta.dados} atualizando={consulta.atualizando} />}
      </div>
    </div>
  )
}

function Relatorio({ demanda, atualizando }: { demanda: Demanda; atualizando: boolean }) {
  const ref = useEntrada<HTMLDivElement>()
  const navegar = useNavigate()
  if (!demanda.buscas) return <Vazio ilustracao="busca">Ninguém buscou nada no app neste período. Tente um período maior.</Vazio>

  const porCategoria = demanda.semResultadoPorCategoria
  const maisFalta = porCategoria[0]
  const parte = Math.round((demanda.semResultado / demanda.buscas) * 100)

  return (
    <div
      ref={ref}
      aria-busy={atualizando}
      className={cx('flex flex-col gap-6 transition-opacity duration-rapida', atualizando && 'opacity-60')}
    >
      <div data-anim className="flex flex-wrap items-start gap-3">
        <StatTile rotulo="Buscas no app" valor={formatarNumero(demanda.buscas)} nota="com e sem resultado" />
        <StatTile rotulo="Sem resultado em nenhuma loja" valor={formatarNumero(demanda.semResultado)} nota={`${parte}% das buscas`} />
        {maisFalta && (
          <StatTile rotulo="O que mais falta" valor={formatarNumero(maisFalta.buscas)} nota={rotuloDaCategoria(maisFalta.categoria)} />
        )}
        {porCategoria.length > 0 && (
          <Button variant="ghost" icon="seta" onClick={() => navegar(urlDaTela('vagas'))} className="self-center">
            Em quais vagas essa demanda cabe
          </Button>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div data-anim className="min-w-0">
          <CartaoGrafico
            titulo="Sem resultado, por categoria"
            descricao="Buscas que não acharam nada em nenhuma loja. Passe o mouse para ver os termos."
            tabela={{
              colunas: ['Categoria', 'Buscas', 'Termos mais buscados'],
              linhas: porCategoria.map((c) => [
                rotuloDaCategoria(c.categoria),
                formatarNumero(c.buscas),
                c.termos.map((t) => t.termo).join(', '),
              ]),
            }}
          >
            {porCategoria.length ? (
              <GraficoRanking
                linhas={porCategoria.map((c) => ({
                  rotulo: rotuloDaCategoria(c.categoria),
                  valor: c.buscas,
                  detalhe: c.termos
                    .slice(0, 3)
                    .map((t) => `${t.termo} (${formatarNumero(t.buscas)})`)
                    .join(', '),
                }))}
                formatarValor={buscas}
              />
            ) : (
              <Vazio ilustracao="busca" compacto>Toda busca achou alguma loja neste período.</Vazio>
            )}
          </CartaoGrafico>
        </div>

        <div data-anim className="min-w-0">
          <CartaoGrafico
            titulo="Mais buscados"
            descricao="Os termos mais buscados no app, com ou sem resultado."
            tabela={{
              colunas: ['Termo', 'Buscas'],
              linhas: demanda.maisBuscados.map((t) => [t.termo, formatarNumero(t.buscas)]),
            }}
          >
            <GraficoRanking linhas={demanda.maisBuscados.map((t) => ({ rotulo: t.termo, valor: t.buscas }))} formatarValor={buscas} />
          </CartaoGrafico>
        </div>
      </div>
    </div>
  )
}
