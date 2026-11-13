import { useEffect, useRef, useState } from 'react'
import { cx } from '../../../componentes/cx'
import { rotuloDaCategoria } from '../../../painel/comum/categorias'
import { rotuloDoPiso } from '../../../painel/comum/formatos'
import type { VagaComSugestao } from '../../../tipos/shopping'
import { carregarPlantas, espalhar, type Planta } from './plantas'

/** O diâmetro do marcador (size-6) e um respiro: abaixo disso, dois marcadores se tocam. */
const MARCADOR_PX = 28

interface PlantaDasVagasProps {
  /** Na ordem dos cartões: o número de cada vaga é a posição dela aqui. */
  vagas: VagaComSugestao[]
}

/**
 * As vagas acesas na planta de cada piso, com o número de prioridade de cada uma (o mesmo dos
 * cartões). O número leva ao cartão. Sem as plantas no projeto, não mostra nada.
 */
export function PlantaDasVagas({ vagas }: PlantaDasVagasProps) {
  const [plantas, setPlantas] = useState<Planta[]>([])

  useEffect(() => {
    let vivo = true
    carregarPlantas()
      .then((lidas) => vivo && setPlantas(lidas))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  const numero = new Map(vagas.map((v, i) => [v.mapaId, i + 1]))
  const comVaga = plantas.filter((p) => p.lojas.some((l) => numero.has(l.mapaId)))
  if (!comVaga.length) return null

  return (
    <section aria-labelledby="titulo-planta" className="flex flex-col gap-4 rounded-md border border-line bg-surface-raised p-5">
      <div className="flex flex-col gap-1">
        <h2 id="titulo-planta" className="text-title-sm">
          Onde ficam as vagas
        </h2>
        <p className="text-body-sm text-ink-muted">
          Os números são a ordem de prioridade dos cartões abaixo. Toque num número para ver a sugestão.
        </p>
      </div>
      <div className={cx('grid items-start gap-6', comVaga.length > 1 && 'lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]')}>
        {comVaga.map((planta) => (
          <PisoComVagas key={planta.piso} planta={planta} vagas={vagas} numero={numero} />
        ))}
      </div>
    </section>
  )
}

function PisoComVagas({ planta, vagas, numero }: { planta: Planta; vagas: VagaComSugestao[]; numero: Map<string, number> }) {
  const { x, y, largura, altura } = planta.viewBox
  const vagasDoPiso = planta.lojas.filter((l) => numero.has(l.mapaId))
  // A largura da planta na tela diz quantos metros cabem num marcador; os marcadores mais
  // perto que isso se afastam (vagas vizinhas).
  const caixa = useRef<HTMLDivElement>(null)
  const [larguraNaTela, setLarguraNaTela] = useState(0)
  useEffect(() => {
    const elemento = caixa.current
    if (!elemento) return
    const observador = new ResizeObserver(([medida]) => setLarguraNaTela(medida.contentRect.width))
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [])
  const metrosPorPx = larguraNaTela ? largura / larguraNaTela : 0
  const posicoes = espalhar(
    vagasDoPiso.map((l) => l.centro),
    MARCADOR_PX * metrosPorPx,
  )
  const porcentagem = (valor: number, origem: number, tamanho: number) => `${((valor - origem) / tamanho) * 100}%`

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-label">{rotuloDoPiso(planta.piso)}</figcaption>
      {/* O SVG fica com a proporção da planta; os números são HTML por cima, com os estilos de texto. */}
      <div ref={caixa} className="relative">
        <svg
          viewBox={`${x} ${y} ${largura} ${altura}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`Planta do ${rotuloDoPiso(planta.piso).toLowerCase()} com ${vagasDoPiso.length} lojas vagas`}
        >
          {planta.contorno && <polygon points={planta.contorno} className="fill-surface-sunken stroke-line" strokeWidth={0.4} />}
          {planta.lojas.map((loja) => (
            <polygon
              key={loja.mapaId}
              points={loja.pontos}
              className={numero.has(loja.mapaId) ? 'fill-mapa-destaque stroke-ouro-ink' : 'fill-mapa-loja stroke-line-strong'}
              strokeWidth={numero.has(loja.mapaId) ? 0.5 : 0.15}
            />
          ))}
        </svg>
        {vagasDoPiso.map((loja, i) => {
          const vaga = vagas.find((v) => v.mapaId === loja.mapaId)
          const n = numero.get(loja.mapaId)
          const sugestao = vaga?.sugestao ? `buscar ${rotuloDaCategoria(vaga.sugestao.categoria)}` : 'sem sugestão'
          return (
            <a
              key={loja.mapaId}
              href={`#vaga-${loja.mapaId}`}
              aria-label={`Prioridade ${n}: ${vaga?.unidade ?? loja.mapaId}, ${sugestao}`}
              title={`${vaga?.unidade ?? ''}: ${sugestao}`}
              style={{ left: porcentagem(posicoes[i].x, x, largura), top: porcentagem(posicoes[i].y, y, altura) }}
              className={cx(
                'absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-caption font-semibold shadow-card',
                vaga?.sugestao ? 'bg-ouro text-on-ouro' : 'bg-surface-raised text-ink',
              )}
            >
              {n}
            </a>
          )
        })}
      </div>
    </figure>
  )
}
