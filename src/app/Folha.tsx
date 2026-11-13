import { useEffect, useId, useRef, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { comMovimento, DURACAO, EASE, useGSAP } from '../movimento'

export interface FolhaProps {
  aberta: boolean
  onFechar: () => void
  titulo: string
  children: ReactNode
}

/**
 * Folha que sobe do rodapé. É um <dialog> nativo: prende o foco (o primeiro campo ou botão já
 * vem focado), fecha com Esc ou tocando fora, e o resto da tela fica inerte.
 */
export function Folha({ aberta, onFechar, titulo, children }: FolhaProps) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()

  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    if (aberta && !d.open) d.showModal()
    if (!aberta && d.open) d.close()
  }, [aberta])

  useGSAP(
    () => {
      const d = dialogo.current
      if (!aberta || !d) return
      const mm = comMovimento(
        () => {
          gsap.fromTo(d, { yPercent: 100 }, { yPercent: 0, duration: DURACAO.media, ease: EASE.saida })
        },
        () => {},
      )
      return () => mm.revert()
    },
    { dependencies: [aberta], revertOnUpdate: true },
  )

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={idTitulo}
      // O evento close chega depois, numa tarefa à parte: se a folha já foi aberta de novo (a da foto
      // volta quando a câmera é negada), o aviso é velho e não fecha nada.
      onClose={() => !dialogo.current?.open && onFechar()}
      onClick={(evento) => evento.target === evento.currentTarget && onFechar()}
      className="mx-auto mb-0 mt-auto w-full max-w-md rounded-t-lg border-0 bg-surface-raised p-0 text-ink shadow-sheet backdrop:bg-terra backdrop:opacity-50"
    >
      <div className="flex flex-col gap-3 px-4 pb-8 pt-3">
        <span aria-hidden="true" className="mb-2 h-1 w-10 self-center rounded-pill bg-line-strong" />
        <h2 id={idTitulo} className="text-title-md">
          {titulo}
        </h2>
        {children}
      </div>
    </dialog>
  )
}
