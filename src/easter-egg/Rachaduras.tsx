import { forwardRef, useMemo } from 'react'
import { cx } from '../componentes/cx'

/** Um número entre -1 e 1 que só depende de n: as rachaduras saem iguais em toda tela. */
const tremido = (n: number) => {
  const s = Math.sin(n * 91.345 + 47.853) * 43758.5453
  return (s - Math.floor(s)) * 2 - 1
}

/**
 * As rachaduras, num quadro de 390 × 844 (um celular em pé): `quantas` fendas saindo da origem,
 * em ziguezague, cada uma com um galho. Devolve o atributo d de cada <path>.
 */
function fendas(origem: { x: number; y: number }, quantas: number) {
  const caminhos: string[] = []
  for (let f = 0; f < quantas; f++) {
    let angulo = (f / quantas) * Math.PI * 2 + tremido(f) * 0.4
    let { x, y } = origem
    let d = `M${x.toFixed(1)} ${y.toFixed(1)}`
    let galho = ''
    for (let passo = 0; passo < 9; passo++) {
      angulo += tremido(f * 31 + passo) * 0.55
      const tamanho = 34 + tremido(f * 7 + passo * 3) * 14
      x += Math.cos(angulo) * tamanho
      y += Math.sin(angulo) * tamanho
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`
      if (passo === 3) {
        const lado = angulo + (tremido(f + 50) > 0 ? 0.9 : -0.9)
        galho = ` M${x.toFixed(1)} ${y.toFixed(1)} l${(Math.cos(lado) * 40).toFixed(1)} ${(Math.sin(lado) * 40).toFixed(1)} l${(Math.cos(lado + 0.5) * 24).toFixed(1)} ${(Math.sin(lado + 0.5) * 24).toFixed(1)}`
      }
    }
    caminhos.push(d, galho.trim())
  }
  return caminhos
}

/**
 * Rachaduras em SVG cobrindo o pai (o apagão e o Piso 13): a fenda em terra com o brilho ouro do
 * tirano por dentro. Decorativas. O apagão desenha cada uma pelo strokeDashoffset (pathLength 1).
 */
export const Rachaduras = forwardRef<SVGSVGElement, { className?: string; origem?: { x: number; y: number }; quantas?: number }>(
  function Rachaduras({ className, origem = { x: 195, y: 470 }, quantas = 7 }, ref) {
    const caminhos = useMemo(() => fendas(origem, quantas), [origem, quantas])
    return (
      <svg
        ref={ref}
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cx('pointer-events-none', className)}
      >
        {caminhos.map((d, i) => (
          <g key={i} data-fenda>
            <path d={d} pathLength={1} stroke="var(--terra)" strokeWidth={5} />
            <path d={d} pathLength={1} stroke="var(--ouro)" strokeWidth={1.4} />
          </g>
        ))}
      </svg>
    )
  },
)
