import { useCallback, useEffect, useRef } from 'react'
import { Button } from '../componentes'
import { APP_NOME } from '../config'
import { cascata, desenharTranca, MOVIMENTO_REDUZIDO, useGSAP } from '../movimento'

/** Depois que a trança termina de se desenhar, quanto tempo a Abertura fica antes da tela pedida. */
const PAUSA_MS = 1200
/** Com movimento reduzido a trança só aparece, e a pausa também é curta. */
const PAUSA_REDUZIDA_MS = 400
/** Teclas que pulam a Abertura, como o toque. */
const TECLAS_PARA_PULAR = new Set(['Enter', ' ', 'Escape'])

/**
 * Abertura: a trança da Capi se desenha, ela se apresenta e o app segue para a tela pedida.
 * Aparece a cada carregamento do app (PortaDoApp). Um toque ou uma tecla pula.
 */
export default function Abertura({ aoTerminar }: { aoTerminar: () => void }) {
  const tela = useRef<HTMLElement>(null)
  const marca = useRef<SVGSVGElement>(null)
  const fio = useRef<SVGPathElement>(null)
  // Termina uma vez só: o toque, a tecla e o fim da animação podem chegar quase juntos.
  const terminou = useRef(false)
  const terminar = useCallback(() => {
    if (terminou.current) return
    terminou.current = true
    aoTerminar()
  }, [aoTerminar])

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (TECLAS_PARA_PULAR.has(evento.key)) terminar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [terminar])

  useGSAP(
    () => {
      if (!tela.current || !fio.current) return
      const pausa = window.matchMedia(MOVIMENTO_REDUZIDO).matches ? PAUSA_REDUZIDA_MS : PAUSA_MS
      let espera: number | undefined
      const tranca = desenharTranca(fio.current, {
        marca: marca.current,
        aoTerminar: () => {
          espera = window.setTimeout(terminar, pausa)
        },
      })
      const textos = cascata(tela.current.querySelectorAll('[data-anim]'), { atraso: 0.6 })
      return () => {
        window.clearTimeout(espera)
        tranca.revert()
        textos.revert()
      }
    },
    { scope: tela },
  )

  return (
    // Um toque em qualquer lugar pula (o "Começar" faz o mesmo, e é o caminho pelo teclado).
    <main
      ref={tela}
      onClick={terminar}
      className="flex min-h-dvh cursor-pointer flex-col items-center justify-center gap-4 bg-terra px-4 py-6 text-center text-on-terra"
    >
      <title>{APP_NOME}</title>
      <svg
        ref={marca}
        viewBox="0 0 32 32"
        aria-hidden="true"
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        className="size-[120px] stroke-ouro"
      >
        <path ref={fio} d="M16 16m-3 0a3 3 0 1 0 6 0a6 6 0 1 0-12 0a9 9 0 1 0 18 0a12 12 0 1 0-24 0" />
      </svg>
      <p data-anim className="mt-4 text-caption font-semibold uppercase tracking-widest text-ouro">
        {APP_NOME}
      </p>
      <h1 data-anim className="text-display">
        Oi, eu sou a Capi.
      </h1>
      <p data-anim className="mb-4 max-w-[28ch] opacity-[.85]">
        Me diga o que você procura. Eu acho no shopping e separo para você.
      </p>
      <Button data-anim variant="ouro" size="lg" onClick={terminar}>
        Começar
      </Button>
    </main>
  )
}
