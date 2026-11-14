import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { comoErroApi, criarReserva, opcoesDaReserva, type ErroApi } from '../api'
import { Badge, formatarPreco, Icon } from '../componentes'
import { cx } from '../componentes/cx'
import type { FormaPagamento, OpcoesDaReserva, ProdutoResumo } from '../tipos'
import { Folha } from './Folha'
import { paraQueValeOCupom } from './formatos'

export interface FolhaReservaProps {
  produto: ProdutoResumo
  aberta: boolean
  onFechar: () => void
}

const OPCOES: { forma: FormaPagamento; titulo: string; detalhe: string; selo?: string }[] = [
  {
    forma: 'PIX',
    titulo: 'Pagar agora com Pix',
    detalhe: 'Retira no balcão sem fila. Depois que a loja confirma, fica separado por 48 h.',
    selo: 'Mais rápido',
  },
  { forma: 'NA_LOJA', titulo: 'Pagar na loja', detalhe: 'Grátis. Depois que a loja confirma, fica separado por 4 h.' },
]

/** Uma escolha entre poucas opções (tamanho, cor, cupom): rádios de verdade, com cara de chips. */
function Escolhas({
  legenda,
  opcoes,
  valor,
  aoMudar,
}: {
  legenda: string
  opcoes: { valor: string; rotulo: string; detalhe?: string }[]
  valor: string
  aoMudar: (valor: string) => void
}) {
  const nome = useId()
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className="mb-2 p-0 text-label">{legenda}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((opcao) => (
          <label key={opcao.valor} className="relative">
            <input
              type="radio"
              name={nome}
              value={opcao.valor}
              checked={valor === opcao.valor}
              onChange={() => aoMudar(opcao.valor)}
              className="peer sr-only"
            />
            <span
              className={cx(
                'flex min-h-11 cursor-pointer flex-col justify-center rounded-md border border-line-strong px-3 py-1.5 text-label text-ink',
                'peer-checked:border-marrom peer-checked:bg-marrom-soft peer-checked:text-marrom-ink',
                'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus-ring',
              )}
            >
              {opcao.rotulo}
              {opcao.detalhe && <span className="text-caption font-normal text-ink-muted">{opcao.detalhe}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/**
 * Folha de reservar: o tamanho e a cor (das opções do produto), um dos cupons da cliente que valem
 * para ele (o preço e o Pix já saem com o desconto, e o cupom fica preso à reserva) e as duas formas
 * de pagar. A loja confirma depois e avisa a partir de que horas fica pronto.
 */
export function FolhaReserva({ produto, aberta, onFechar }: FolhaReservaProps) {
  const navigate = useNavigate()
  const [enviando, setEnviando] = useState<FormaPagamento | null>(null)
  const [erro, setErro] = useState<ErroApi | null>(null)
  const [opcoes, setOpcoes] = useState<OpcoesDaReserva | null>(null)
  const [tamanho, setTamanho] = useState('')
  const [cor, setCor] = useState('')
  const [cupomId, setCupomId] = useState('')

  // As opções e os cupons, quando a folha abre. Sem eles (sem rede), dá para reservar sem cupom.
  useEffect(() => {
    if (!aberta) return
    let ativa = true
    opcoesDaReserva(produto.id).then(
      (lidas) => ativa && setOpcoes(lidas),
      () => ativa && setOpcoes({ tamanhos: [], cores: [], itens: [] }),
    )
    return () => {
      ativa = false
    }
  }, [aberta, produto.id])

  const cupom = opcoes?.itens.find((c) => c.id === cupomId)
  const total = produto.precoCentavos - (cupom?.descontoCentavos ?? 0)

  async function reservar(forma: FormaPagamento) {
    setEnviando(forma)
    setErro(null)
    try {
      const reserva = await criarReserva({
        produtoId: produto.id,
        quantidade: 1,
        formaPagamento: forma,
        ...(tamanho ? { tamanho } : {}),
        ...(cor ? { cor } : {}),
        ...(cupomId ? { cupomId } : {}),
      })
      // A tela da reserva lê tudo pelo id (GET /api/reservas/{id}), então também abre pelo link.
      navigate(`/reserva/${reserva.id}`)
    } catch (falha) {
      setErro(comoErroApi(falha))
      setEnviando(null)
    }
  }

  return (
    <Folha aberta={aberta} onFechar={onFechar} titulo="Como você quer reservar?">
      {opcoes === null ? (
        <p role="status" className="text-body-sm text-ink-muted">
          Carregando os tamanhos e os seus cupons…
        </p>
      ) : (
        <>
          {opcoes.tamanhos.length > 0 && (
            <Escolhas
              legenda="Tamanho"
              opcoes={opcoes.tamanhos.map((t) => ({ valor: t, rotulo: t }))}
              valor={tamanho}
              aoMudar={setTamanho}
            />
          )}
          {opcoes.cores.length > 1 && (
            <Escolhas legenda="Cor" opcoes={opcoes.cores.map((c) => ({ valor: c, rotulo: c }))} valor={cor} aoMudar={setCor} />
          )}
          {opcoes.itens.length > 0 && (
            <Escolhas
              legenda="Cupom"
              opcoes={[
                { valor: '', rotulo: 'Sem cupom' },
                ...opcoes.itens.map((c) => ({
                  valor: c.id,
                  rotulo: `${c.titulo} · −${formatarPreco(c.descontoCentavos)}`,
                  detalhe: paraQueValeOCupom(c),
                })),
              ]}
              valor={cupomId}
              aoMudar={setCupomId}
            />
          )}
          <p className="text-body">
            Total <strong className="text-price">{formatarPreco(total)}</strong>
            {cupom && <span className="text-body-sm text-ink-muted"> (de {formatarPreco(produto.precoCentavos)})</span>}
          </p>
        </>
      )}
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
