import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { gsap } from 'gsap'
import { comoErroApi, criarReserva, type ErroApi } from '../api'
import { Badge, Icon } from '../componentes'
import { comMovimento, DURACAO, EASE, useGSAP } from '../movimento'
import type { FormaPagamento, ProdutoResumo, Reserva } from '../tipos'

export interface FolhaReservaProps {
  produto: ProdutoResumo
  aberta: boolean
  onFechar: () => void
}

/** O que a tela de Reserva recebe pela navegação (não há GET de uma reserva no contrato). */
export interface EstadoReserva {
  reserva: Reserva
  produto: ProdutoResumo
}

const OPCOES: { forma: FormaPagamento; titulo: string; detalhe: string; selo?: string }[] = [
  {
    forma: 'PIX',
    titulo: 'Pagar agora com Pix',
    detalhe: 'Retira no balcão sem fila. Fica separado por 48 h.',
    selo: 'Mais rápido',
  },
  { forma: 'NA_LOJA', titulo: 'Pagar na loja', detalhe: 'Grátis. Fica separado por 4 h.' },
]

/**
 * Folha que sobe do rodapé com as duas formas de reservar. É um <dialog> nativo: prende o foco,
 * fecha com Esc ou tocando fora, e o resto da tela fica inerte.
 */
export function FolhaReserva({ produto, aberta, onFechar }: FolhaReservaProps) {
  const navigate = useNavigate()
  const dialogo = useRef<HTMLDialogElement>(null)
  const [enviando, setEnviando] = useState<FormaPagamento | null>(null)
  const [erro, setErro] = useState<ErroApi | null>(null)

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

  async function reservar(forma: FormaPagamento) {
    setEnviando(forma)
    setErro(null)
    try {
      const reserva = await criarReserva({ produtoId: produto.id, quantidade: 1, formaPagamento: forma })
      const { id, nome, categoria, precoCentavos, estoque, foto, loja } = produto
      const estado: EstadoReserva = { reserva, produto: { id, nome, categoria, precoCentavos, estoque, foto, loja } }
      navigate(`/reserva/${reserva.id}`, { state: estado })
    } catch (falha) {
      setErro(comoErroApi(falha))
      setEnviando(null)
    }
  }

  return (
    <dialog
      ref={dialogo}
      aria-labelledby="titulo-folha"
      onClose={onFechar}
      onClick={(evento) => evento.target === evento.currentTarget && onFechar()}
      className="mx-auto mb-0 mt-auto w-full max-w-md rounded-t-lg border-0 bg-surface-raised p-0 text-ink shadow-sheet backdrop:bg-terra backdrop:opacity-50"
    >
      <div className="flex flex-col gap-3 px-4 pb-8 pt-3">
        <span aria-hidden="true" className="mb-2 h-1 w-10 self-center rounded-pill bg-line-strong" />
        <h2 id="titulo-folha" className="text-title-md">
          Como você quer reservar?
        </h2>
        {OPCOES.map(({ forma, titulo, detalhe, selo }) => (
          <button
            key={forma}
            type="button"
            disabled={enviando !== null}
            aria-busy={enviando === forma}
            onClick={() => reservar(forma)}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-line-strong bg-surface p-4 text-left text-ink transition-colors hover:border-marrom disabled:cursor-not-allowed disabled:opacity-[.45] motion-reduce:transition-none"
          >
            <span>
              <strong className="block text-label">{titulo}</strong>
              <span className="text-body-sm text-ink-muted">{enviando === forma ? 'Reservando…' : detalhe}</span>
            </span>
            {selo && <Badge tone="cerrado">{selo}</Badge>}
          </button>
        ))}
        {erro && (
          <p role="alert" className="flex items-start gap-2 text-body-sm text-perigo-ink">
            <Icon name="alerta" className="mt-px" />
            {erro.mensagem}
          </p>
        )}
      </div>
    </dialog>
  )
}
