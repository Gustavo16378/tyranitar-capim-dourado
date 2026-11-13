import { Bar, BarChart, LabelList, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import { formatarNumero } from '../../../componentes/formatar'
import { COR_DA_SERIE, COR_DA_SERIE_EM_DESTAQUE } from './cores'

export interface LinhaDoRanking {
  rotulo: string
  valor: number
  /** Linha extra no tooltip: "R$ 3.685,90 vendidos". */
  detalhe?: string
}

interface GraficoRankingProps {
  linhas: LinhaDoRanking[]
  /** Valor com a unidade, para o tooltip: "41 unidades". Na ponta da barra vai só o número. */
  formatarValor: (valor: number) => string
}

// Barras de no máximo 24 px (aqui 20), com 20 px de ar entre elas.
const ESPESSURA = 20
const LINHA = 40
const LARGURA_DO_ROTULO = 184

/**
 * Ranking em barras horizontais, do maior para o menor, num tom só (uma série não tem
 * legenda: o título do cartão diz o que é). O número vai na ponta de cada barra; o tooltip
 * traz o valor com a unidade e o detalhe. Sem animação do recharts: a entrada é a cascata do GSAP.
 */
export function GraficoRanking({ linhas, formatarValor }: GraficoRankingProps) {
  return (
    <BarChart
      layout="vertical"
      data={linhas}
      responsive
      style={{ width: '100%', height: linhas.length * LINHA + 8 }}
      margin={{ top: 4, right: 48, bottom: 4, left: 0 }}
    >
      <XAxis type="number" hide domain={[0, 'dataMax']} />
      <YAxis
        type="category"
        dataKey="rotulo"
        width={LARGURA_DO_ROTULO}
        axisLine={false}
        tickLine={false}
        tick={({ x, y, payload }) => <RotuloDaCategoria x={Number(x)} y={Number(y)} texto={String(payload.value)} />}
      />
      <Tooltip
        cursor={{ fill: 'var(--surface-sunken)' }}
        content={(props: TooltipContentProps) => <Dica {...props} formatarValor={formatarValor} />}
      />
      <Bar
        dataKey="valor"
        fill={COR_DA_SERIE}
        barSize={ESPESSURA}
        // Ponta arredondada de 4 px; o lado da linha de base fica reto.
        radius={[0, 4, 4, 0]}
        activeBar={{ fill: COR_DA_SERIE_EM_DESTAQUE }}
        isAnimationActive={false}
      >
        <LabelList
          dataKey="valor"
          content={({ x, y, width, height, value }) => (
            <text
              x={Number(x) + Number(width) + 8}
              y={Number(y) + Number(height) / 2}
              dominantBaseline="central"
              className="fill-ink text-label tabular-nums"
            >
              {formatarNumero(Number(value))}
            </text>
          )}
        />
      </Bar>
    </BarChart>
  )
}

/** Nome da categoria à esquerda da barra, em texto de apoio; nomes longos terminam em "…". */
function RotuloDaCategoria({ x, y, texto }: { x: number; y: number; texto: string }) {
  const curto = texto.length > 25 ? `${texto.slice(0, 24)}…` : texto
  return (
    <text x={x - 8} y={y} textAnchor="end" dominantBaseline="central" className="fill-ink-muted text-body-sm">
      <title>{texto}</title>
      {curto}
    </text>
  )
}

/** Tooltip: o valor na frente, o nome depois (o leitor já sabe qual barra apontou). */
function Dica({ active, payload, formatarValor }: TooltipContentProps & { formatarValor: (v: number) => string }) {
  const linha = payload?.[0]?.payload as LinhaDoRanking | undefined
  if (!active || !linha) return null
  return (
    <div className="flex flex-col gap-0.5 rounded-sm border border-line bg-surface-raised px-3 py-2 shadow-card">
      <span className="text-label tabular-nums text-ink">{formatarValor(linha.valor)}</span>
      <span className="text-body-sm text-ink-muted">{linha.rotulo}</span>
      {linha.detalhe && <span className="text-body-sm text-ink-muted">{linha.detalhe}</span>}
    </div>
  )
}
