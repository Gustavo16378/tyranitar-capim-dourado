// Página do mapa 3D (/mapa-3d?loja=<mapa_id>): um piso por vez, com o botão para trocar, a loja
// buscada em destaque e a rota da entrada até ela. Tocar numa loja traça a rota até ela.
// A tela Mapa do app pode usar o componente Mapa3D do mesmo jeito.
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Badge } from '../componentes'
import { cx } from '../componentes/cx'
import { APP_NOME } from '../config'
import { useEntrada } from '../movimento'
import { acharNaPlanta, rotaAte } from './dados'
import { minutosAPe, type Piso } from './grafo'
import { Mapa3D } from './Mapa3D'

const NOME_DO_PISO: Record<Piso, string> = { 1: 'Térreo', 2: '2º piso' }

/** Nomes das lojas ativas, de GET /api/lojas. Sem a API, o mapa mostra todas como lojas. */
function useNomesDasLojas() {
  const [nomes, setNomes] = useState<Record<string, string>>()
  useEffect(() => {
    const controle = new AbortController()
    fetch('/api/lojas?tamanho=200', { signal: controle.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((dados: { itens: { mapaId: string; nome: string }[] } | null) => {
        if (dados) setNomes(Object.fromEntries(dados.itens.map((l) => [l.mapaId, l.nome])))
      })
      .catch(() => {})
    return () => controle.abort()
  }, [])
  return nomes
}

export default function PaginaMapa3D() {
  const [params, setParams] = useSearchParams()
  const destino = params.get('loja') ?? undefined
  const nomes = useNomesDasLojas()
  return (
    <MapaAte
      key={destino ?? ''}
      destino={destino}
      nomes={nomes}
      aoEscolher={(mapaId) => setParams({ loja: mapaId }, { replace: true })}
    />
  )
}

function MapaAte({
  destino,
  nomes,
  aoEscolher,
}: {
  destino?: string
  nomes?: Record<string, string>
  aoEscolher: (mapaId: string) => void
}) {
  const achado = destino ? acharNaPlanta(destino) : undefined
  const [piso, setPiso] = useState<Piso>(achado?.piso ?? 1)
  const rota = destino ? rotaAte(destino) : null
  const nome = destino ? (nomes?.[destino] ?? destino) : undefined
  const ref = useEntrada<HTMLDivElement>()

  const descricao = rota
    ? `Mapa do ${NOME_DO_PISO[piso].toLowerCase()} com a rota da entrada até ${nome}, ${Math.round(rota.metros)} metros.`
    : `Mapa do ${NOME_DO_PISO[piso].toLowerCase()} do Capim Dourado Shopping.`

  return (
    <main ref={ref} className="mx-auto flex min-h-dvh max-w-[960px] flex-col gap-4 bg-surface px-4 py-6 text-ink">
      <title>{nome ? `Rota até ${nome} · ${APP_NOME}` : `Mapa · ${APP_NOME}`}</title>
      <header data-anim className="flex items-start justify-between gap-3">
        <div>
          <p className="text-body-sm text-ink-muted">{nome ? 'Rota até' : 'Mapa do shopping'}</p>
          <h1 className="text-title-md">{nome ?? 'Capim Dourado Shopping'}</h1>
        </div>
        <div role="tablist" aria-label="Piso" className="flex rounded-pill bg-surface-sunken p-1">
          {([1, 2] as const).map((n) => (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={piso === n}
              onClick={() => setPiso(n)}
              className={cx(
                'cursor-pointer rounded-pill border-0 px-3 py-2 text-label',
                piso === n ? 'bg-marrom text-on-marrom' : 'bg-transparent text-ink-muted',
              )}
            >
              {NOME_DO_PISO[n]}
            </button>
          ))}
        </div>
      </header>

      <div data-anim role="img" aria-label={descricao} className="relative h-[62dvh] min-h-[320px] overflow-hidden rounded-lg bg-surface-sunken">
        <Mapa3D piso={piso} destino={destino} nomes={nomes} onSelecionarLoja={aoEscolher} />
      </div>

      <div data-anim className="flex flex-col items-start gap-2">
        {rota && achado?.piso === piso && (
          <Badge tone="ouro" icon="pin">
            {minutosAPe(rota.metros)} min a pé · {Math.round(rota.metros)} m
          </Badge>
        )}
        <p className="text-body-sm text-ink-muted">
          {!destino
            ? 'Toque numa loja para ver o caminho. Arraste para girar e use dois dedos para aproximar.'
            : !achado
              ? 'Essa loja ainda não está na planta.'
              : achado.piso !== piso
                ? `${nome} fica no ${NOME_DO_PISO[achado.piso].toLowerCase()}: troque o piso para ver a rota.`
                : 'Saindo da entrada mais próxima. Arraste para girar o mapa.'}
        </p>
      </div>
    </main>
  )
}
