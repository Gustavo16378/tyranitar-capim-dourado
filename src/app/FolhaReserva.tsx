import { useState } from 'react'
import { useNavigate } from 'react-router'
import { comoErroApi, criarReserva, type ErroApi } from '../api'
import { Badge, Icon } from '../componentes'
import type { FormaPagamento, ProdutoResumo } from '../tipos'
import { Folha } from './Folha'

export interface FolhaReservaProps {
  produto: ProdutoResumo
  aberta: boolean
  onFechar: () => void
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

/** Folha com as duas formas de reservar: pagar agora com Pix ou pagar na loja. */
export function FolhaReserva({ produto, aberta, onFechar }: FolhaReservaProps) {
  const navigate = useNavigate()
  const [enviando, setEnviando] = useState<FormaPagamento | null>(null)
  const [erro, setErro] = useState<ErroApi | null>(null)

  async function reservar(forma: FormaPagamento) {
    setEnviando(forma)
    setErro(null)
    try {
      const reserva = await criarReserva({ produtoId: produto.id, quantidade: 1, formaPagamento: forma })
      // A tela da reserva lê tudo pelo id (GET /api/reservas/{id}), então também abre pelo link.
      navigate(`/reserva/${reserva.id}`)
    } catch (falha) {
      setErro(comoErroApi(falha))
      setEnviando(null)
    }
  }

  return (
    <Folha aberta={aberta} onFechar={onFechar} titulo="Como você quer reservar?">
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
    </Folha>
  )
}
