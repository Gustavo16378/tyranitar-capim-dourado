import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from 'gsap'
import { comMovimento, DURACAO, useGSAP } from '../movimento'

/** O gato, de lado, andando para a direita. Desenho original: terra com contorno e o olho em ouro. */
function Gato() {
  return (
    <svg viewBox="0 0 120 80" className="h-20 w-[120px]" aria-hidden="true">
      <g fill="var(--terra)" stroke="var(--line-strong)" strokeWidth={1.5} strokeLinejoin="round">
        <path data-pata="tras" d="M30 52h6v20a3 3 0 0 1-6 0z" />
        <path data-pata="frente" d="M70 52h6v20a3 3 0 0 1-6 0z" />
        <path d="M24 44C12 40 7 27 14 15" fill="none" strokeWidth={6} strokeLinecap="round" stroke="var(--terra)" />
        <path d="M24 44C12 40 7 27 14 15" fill="none" strokeWidth={1.5} strokeLinecap="round" />
        <ellipse cx={52} cy={46} rx={30} ry={14} />
        <path data-pata="tras" d="M38 52h6v20a3 3 0 0 1-6 0z" />
        <path data-pata="frente" d="M78 52h6v20a3 3 0 0 1-6 0z" />
        <path d="M76 27l3-15 8 10zM89 22l8-11 1 15z" />
        <circle cx={87} cy={34} r={13} />
      </g>
      {/* O olho que brilha no escuro, com a pupila em fenda. */}
      <ellipse cx={93} cy={32} rx={3.4} ry={4} fill="var(--ouro)" />
      <ellipse cx={93.6} cy={32} rx={0.9} ry={3.2} fill="var(--terra)" />
    </svg>
  )
}

/**
 * Um gato preto atravessa a tela, por baixo de tudo e sem pegar o toque (13 toques no CapiMark
 * da Capi). Com movimento reduzido, ele só aparece no meio e some. Decorativo: a tela que o solta
 * avisa o leitor de tela.
 */
export function GatoPreto({ aoTerminar }: { aoTerminar: () => void }) {
  const palco = useRef<HTMLDivElement>(null)
  useGSAP(
    () => {
      const gato = palco.current?.firstElementChild
      if (!gato) return
      const mm = comMovimento(
        () => {
          const largura = window.innerWidth
          gsap.fromTo(gato, { x: -140 }, { x: largura + 20, duration: 4.5, ease: 'none', onComplete: aoTerminar })
          // O passo: as patas da frente e de trás vão e voltam, e o corpo sobe um pouco a cada passo.
          gsap.fromTo(gato.querySelectorAll('[data-pata="frente"]'), { rotate: -16 }, { rotate: 16, duration: 0.25, repeat: 17, yoyo: true, ease: 'sine.inOut', transformOrigin: '50% 0%' })
          gsap.fromTo(gato.querySelectorAll('[data-pata="tras"]'), { rotate: 16 }, { rotate: -16, duration: 0.25, repeat: 17, yoyo: true, ease: 'sine.inOut', transformOrigin: '50% 0%' })
          gsap.fromTo(gato.querySelector('svg'), { y: 0 }, { y: -2, duration: 0.25, repeat: 17, yoyo: true, ease: 'sine.inOut' })
        },
        () => {
          gsap.set(gato, { x: window.innerWidth / 2 - 60 })
          gsap
            .timeline({ onComplete: aoTerminar })
            .fromTo(gato, { opacity: 0 }, { opacity: 1, duration: DURACAO.rapida })
            .to(gato, { opacity: 0, duration: DURACAO.rapida }, '+=1.6')
        },
      )
      return () => mm.revert()
    },
    { scope: palco },
  )
  return createPortal(
    <div ref={palco} aria-hidden="true" data-gato-preto className="pointer-events-none fixed inset-x-0 bottom-28 z-40 overflow-hidden md:bottom-8">
      <div className="w-[120px]">
        <Gato />
      </div>
    </div>,
    document.body,
  )
}
