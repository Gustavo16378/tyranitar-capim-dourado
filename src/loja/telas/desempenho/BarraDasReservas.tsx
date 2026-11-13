import { Bar, BarChart, LabelList, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import { formatarNumero } from '../../../componentes'
import type { Relatorio } from '../../../tipos/loja'
import { partesDasReservas, porcentagem, type Partes } from './contas'
import { SUPERFICIE, TEXTO_NO_BLOCO } from '../../../painel/graficos/cores'
import { PARTES_DAS_RESERVAS } from './cores'

/** Bloco estreito demais para o rótulo fica sem ele; o valor continua no tooltip e na tabela. */
const LARGURA_MINIMA_DO_ROTULO = 44

/**
 * Barra segmentada alta (28 px): como as reservas do período terminaram. Cada parte é um
 * bloco com cantos de 4 px e a porcentagem dentro, separado do próximo por 2 px da
 * superfície. A legenda dá os nomes, na ordem dos blocos.
 */
export function BarraDasReservas({ reservas }: { reservas: Relatorio['reservas'] }) {
  const partes = partesDasReservas(reservas)
  const total = reservas.feitas
  const resumo = PARTES_DAS_RESERVAS.map((p) => `${p.nome}: ${partes[p.chave]} (${porcentagem(partes[p.chave], total)}%)`).join(', ')

  return (
    <div className="flex flex-col gap-3">
      <BarChart
        layout="vertical"
        data={[{ nome: 'Reservas', ...partes }]}
        responsive
        style={{ width: '100%', height: 28 }}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        title={`Reservas do período. ${resumo}.`}
      >
        <XAxis type="number" hide domain={[0, total]} />
        <YAxis type="category" dataKey="nome" hide />
        <Tooltip
          cursor={false}
          content={(props: TooltipContentProps) => <Dica {...props} total={total} />}
        />
        {PARTES_DAS_RESERVAS.map((parte) => (
          <Bar
            key={parte.chave}
            dataKey={parte.chave}
            name={parte.nome}
            stackId="reservas"
            fill={parte.cor}
            stroke={SUPERFICIE}
            strokeWidth={2}
            radius={4}
            barSize={28}
            isAnimationActive={false}
          >
            <LabelList
              dataKey={parte.chave}
              content={({ x, y, width, height, value }) =>
                Number(width) >= LARGURA_MINIMA_DO_ROTULO ? (
                  <text
                    x={Number(x) + 10}
                    y={Number(y) + Number(height) / 2}
                    dominantBaseline="central"
                    fill={TEXTO_NO_BLOCO}
                    className="text-label tabular-nums"
                  >
                    {porcentagem(Number(value), total)}%
                  </text>
                ) : null
              }
            />
          </Bar>
        ))}
      </BarChart>

      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-body-sm text-ink-muted" aria-label="Legenda">
        {PARTES_DAS_RESERVAS.map((parte) => (
          <li key={parte.chave} className="flex items-center gap-2">
            <span aria-hidden="true" className={`size-3 rounded-sm ${parte.classe}`} />
            {parte.nome}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Um tooltip com todas as partes: o valor na frente, o nome depois, uma linha da cor ao lado. */
function Dica({ active, total, payload }: TooltipContentProps & { total: number }) {
  const linha = payload?.[0]?.payload as (Partes & { nome: string }) | undefined
  if (!active || !linha) return null
  return (
    <div className="flex flex-col gap-1 rounded-sm border border-line bg-surface-raised px-3 py-2 shadow-card">
      {PARTES_DAS_RESERVAS.map((parte) => (
        <div key={parte.chave} className="flex items-center gap-2">
          <span aria-hidden="true" className={`h-0.5 w-3 rounded-pill ${parte.classe}`} />
          <span className="text-label tabular-nums text-ink">
            {formatarNumero(linha[parte.chave])} ({porcentagem(linha[parte.chave], total)}%)
          </span>
          <span className="text-body-sm text-ink-muted">{parte.nome}</span>
        </div>
      ))}
    </div>
  )
}
