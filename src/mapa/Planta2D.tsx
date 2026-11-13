import { useCallback, useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { Icon } from '../componentes'
import { cx } from '../componentes/cx'
import { comMovimento, DURACAO, EASE, useGSAP } from '../movimento'
import type { Piso } from '../tipos'
import { caminhoSvg, ENTRADA, PLANTA, rotaAte } from './planta'

export interface Planta2DProps {
  piso: Piso
  /** mapaId da loja de destino: fica destacada, com a rota da entrada e o pino. */
  destino?: string
}

/** A planta deitada em perspectiva, como no protótipo. */
const INCLINACAO = { rotateX: 52, rotateZ: -32, scale: 0.92 }

/**
 * Planta 2D em perspectiva (até o mapa 3D da Fase 6): a planta deita, as lojas aparecem em
 * cascata, a rota se desenha da entrada até a loja e o pino cai sobre ela.
 */
export function Planta2D({ piso, destino }: Planta2DProps) {
  const palco = useRef<HTMLDivElement>(null)
  const cena = useRef<HTMLDivElement>(null)
  const rota = useRef<SVGPathElement>(null)
  const pinoRef = useRef<HTMLSpanElement>(null)
  const [pino, setPino] = useState<{ piso: Piso; left: number; top: number } | null>(null)
  const pontos = piso === 1 && destino ? rotaAte(destino) : undefined

  // O pino fica no meio da loja destacada, já com a planta inclinada.
  const posicionar = useCallback(() => {
    const alvo = cena.current?.querySelector('[data-alvo]')
    const base = palco.current?.getBoundingClientRect()
    if (!alvo || !base) return setPino(null)
    const a = alvo.getBoundingClientRect()
    setPino({ piso, left: a.left - base.left + a.width / 2 - 20, top: a.top - base.top + a.height / 2 - 44 })
  }, [piso])

  useEffect(() => {
    window.addEventListener('resize', posicionar)
    return () => window.removeEventListener('resize', posicionar)
  }, [posicionar])

  useGSAP(
    () => {
      const el = cena.current
      if (!el) return
      const mm = comMovimento(
        () => {
          const tl = gsap.timeline({ onComplete: posicionar })
          tl.fromTo(
            el,
            { rotateX: 0, rotateZ: 0, scale: 0.8 },
            { ...INCLINACAO, duration: DURACAO.lenta, ease: EASE.suave },
          )
          tl.fromTo(
            el.querySelectorAll('[data-bloco]'),
            { opacity: 0, y: -12 },
            { opacity: 1, y: 0, duration: DURACAO.media, ease: EASE.saida, stagger: 0.04 },
            0.3,
          )
          if (rota.current) {
            const comprimento = rota.current.getTotalLength()
            tl.fromTo(
              rota.current,
              { strokeDasharray: comprimento, strokeDashoffset: comprimento },
              { strokeDashoffset: 0, duration: DURACAO.lenta, ease: EASE.suave },
              0.6,
            )
          }
        },
        () => {
          gsap.set(el, INCLINACAO)
          posicionar()
        },
      )
      return () => mm.revert()
    },
    { dependencies: [piso, destino], revertOnUpdate: true },
  )

  // O pino cai com um quique quando acha o lugar.
  const pinoVisivel = pino?.piso === piso ? pino : null
  useGSAP(
    () => {
      if (!pinoVisivel || !pinoRef.current) return
      const alvo = pinoRef.current
      const mm = comMovimento(
        () => {
          gsap.fromTo(alvo, { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: DURACAO.media, ease: EASE.mola })
        },
        () => {},
      )
      return () => mm.revert()
    },
    { dependencies: [pinoVisivel?.left, pinoVisivel?.top] },
  )

  return (
    <div
      ref={palco}
      className="relative grid h-[380px] place-items-center overflow-hidden rounded-lg bg-surface-sunken [perspective:900px]"
    >
      <div
        ref={cena}
        className="w-full max-w-[340px] [transform-style:preserve-3d] [transform:rotateX(52deg)_rotateZ(-32deg)_scale(.92)]"
      >
        <svg
          viewBox="0 0 380 270"
          role="img"
          aria-label={
            piso === 1
              ? 'Planta do térreo com a rota da entrada até a loja'
              : 'Planta do segundo piso, praça de alimentação'
          }
          className="h-auto w-full"
        >
          <rect x={8} y={8} width={364} height={224} rx={14} className="fill-surface-raised stroke-line" />
          {PLANTA[piso].map((bloco) => {
            const alvo = bloco.id === destino
            return (
              <g key={bloco.id} data-bloco>
                <rect
                  x={bloco.x}
                  y={bloco.y}
                  width={bloco.largura}
                  height={bloco.altura}
                  rx={6}
                  data-alvo={alvo || undefined}
                  strokeWidth={alvo ? 1.5 : 0.8}
                  className={cx(
                    alvo ? 'fill-mapa-destaque stroke-marrom' : 'stroke-line-strong',
                    !alvo && (bloco.tipo === 'loja' ? 'fill-mapa-loja' : 'fill-mapa-alimentacao'),
                  )}
                />
                <text
                  x={bloco.x + bloco.largura / 2}
                  y={bloco.y + bloco.altura / 2 + 3}
                  textAnchor="middle"
                  fontSize={9}
                  className="fill-ink font-sans font-semibold"
                >
                  {bloco.nome}
                </text>
              </g>
            )
          })}
          {pontos && (
            <path
              ref={rota}
              d={caminhoSvg(pontos)}
              fill="none"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-marrom"
            />
          )}
          {piso === 1 && (
            <>
              <circle
                cx={ENTRADA.x}
                cy={ENTRADA.y}
                r={7}
                strokeWidth={3}
                className="fill-cerrado stroke-surface-raised"
              />
              <text x={ENTRADA.x + 14} y={ENTRADA.y + 4} fontSize={9} className="fill-ink font-sans font-semibold">
                Entrada
              </text>
            </>
          )}
        </svg>
      </div>
      {pinoVisivel && (
        <span
          ref={pinoRef}
          aria-hidden="true"
          className="absolute"
          style={{ left: pinoVisivel.left, top: pinoVisivel.top }}
        >
          <span className="grid size-10 -rotate-45 place-items-center rounded-[50%_50%_50%_0] bg-marrom text-on-marrom shadow-card">
            <Icon name="pin" className="rotate-45" />
          </span>
        </span>
      )}
    </div>
  )
}
