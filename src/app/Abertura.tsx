import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../componentes'
import { APP_NOME } from '../config'
import { cascata, desenharTranca, useGSAP } from '../movimento'

/** Depois que a trança termina de se desenhar, quanto tempo a Abertura fica antes do Início. */
const PAUSA_MS = 1200

/** Abertura: a trança da Capi se desenha, ela se apresenta e o app segue para o Início. */
export default function Abertura() {
  const navigate = useNavigate()
  const tela = useRef<HTMLElement>(null)
  const marca = useRef<SVGSVGElement>(null)
  const fio = useRef<SVGPathElement>(null)
  const comecar = useCallback(() => navigate('/inicio', { replace: true }), [navigate])

  useGSAP(
    () => {
      if (!tela.current || !fio.current) return
      let espera: number | undefined
      const tranca = desenharTranca(fio.current, {
        marca: marca.current,
        aoTerminar: () => {
          espera = window.setTimeout(comecar, PAUSA_MS)
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
    <main
      ref={tela}
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-terra px-4 py-6 text-center text-on-terra"
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
      <Button data-anim variant="ouro" size="lg" onClick={comecar}>
        Começar
      </Button>
    </main>
  )
}
