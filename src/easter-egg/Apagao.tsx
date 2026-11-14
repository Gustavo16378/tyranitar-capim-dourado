import { useRef, type ComponentProps } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from 'gsap'
import { EASE, MOVIMENTO_REDUZIDO, useGSAP } from '../movimento'
import { planoDoApagao } from './planoDoApagao'
import { Rachaduras } from './Rachaduras'

/**
 * A camada escura do apagão e do clarão. data-theme="dark" faz o surface-sunken dela ser o do
 * tema escuro (quase preto) também no tema claro: só token, nenhuma cor escrita.
 */
export function CamadaEscura({ className, ...resto }: ComponentProps<'div'>) {
  return <div data-theme="dark" className={`absolute inset-0 bg-surface-sunken ${className ?? ''}`} {...resto} />
}

/**
 * O apagão, por cima de tudo (portal no body): a tela treme, as rachaduras se desenham e as luzes
 * piscam até apagar, no roteiro de planoDoApagao.ts (no máximo 3 piscadas por segundo). Com
 * prefers-reduced-motion, a tela só escurece. No fim, com tudo escuro, chama aoApagar.
 */
export function Apagao({ aoApagar }: { aoApagar: () => void }) {
  const camada = useRef<HTMLDivElement>(null)
  const escuro = useRef<HTMLDivElement>(null)
  const rachaduras = useRef<SVGSVGElement>(null)

  useGSAP(
    () => {
      const plano = planoDoApagao(window.matchMedia(MOVIMENTO_REDUZIDO).matches)
      const tl = gsap.timeline({ onComplete: aoApagar })
      // A tela inteira do app treme (o #root); a camada do apagão fica parada por cima.
      const app = document.getElementById('root')
      if (plano.tremor && app) {
        const vai = 0.05
        tl.fromTo(
          app,
          { x: -6 },
          { x: 6, duration: vai, ease: 'none', yoyo: true, repeat: Math.round(plano.tremor / vai) - 1, clearProps: 'transform' },
          0,
        )
      }
      const fendas = rachaduras.current?.querySelectorAll('path')
      if (plano.rachaduras !== null && fendas?.length) {
        tl.fromTo(
          fendas,
          { strokeDasharray: 1, strokeDashoffset: 1, opacity: 1 },
          { strokeDashoffset: 0, duration: 0.6, ease: EASE.saida, stagger: 0.02 },
          plano.rachaduras,
        )
      }
      for (const passo of plano.luzes) {
        tl.to(escuro.current, { opacity: passo.opacidade, duration: passo.duracao, ease: 'none' }, passo.em)
      }
      tl.set({}, {}, plano.fim)
    },
    { scope: camada },
  )

  return createPortal(
    // Por cima de tudo e pegando o toque: nada se aperta no meio do apagão.
    <div ref={camada} aria-hidden="true" data-apagao className="fixed inset-0 z-50 cursor-wait">
      <Rachaduras ref={rachaduras} className="absolute inset-0 size-full [&_path]:opacity-0" />
      <CamadaEscura ref={escuro} className="opacity-0" />
    </div>,
    document.body,
  )
}

/**
 * O fim de um apagão ou o acender das luzes: a camada escura, cobrindo tudo, some devagar e
 * mostra a tela de baixo. Só clareia uma vez (não pisca), com ou sem movimento reduzido.
 */
export function Revelar({ de = 1, aoTerminar }: { de?: number; aoTerminar: () => void }) {
  const escuro = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    gsap.fromTo(escuro.current, { opacity: de }, { opacity: 0, duration: 0.72, ease: EASE.suave, onComplete: aoTerminar })
  })
  return createPortal(
    <div aria-hidden="true" data-revelar className="pointer-events-none fixed inset-0 z-50">
      <CamadaEscura ref={escuro} />
    </div>,
    document.body,
  )
}
