import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router'
import { listarLojas, useDados } from '../api'
import { Badge, Icon, type IconName } from '../componentes'
import { cx } from '../componentes/cx'
import { APP_NOME } from '../config'
import { acharNaPlanta, rotaAte } from '../mapa/dados'
import { minutosAPe } from '../mapa/grafo'
import { Mapa3D, type ControleDoMapa } from '../mapa/Mapa3D'
import type { Piso } from '../tipos'
import { nomeDoPiso } from './formatos'

const PISOS: Piso[] = [1, 2]

/** Botão redondo sobre o mapa (44 px de toque), com o nome para o leitor de tela. */
function BotaoDoMapa({ rotulo, icone, onClick }: { rotulo: string; icone: IconName; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      onClick={onClick}
      className="grid size-11 cursor-pointer place-items-center rounded-full border border-line-strong bg-surface-raised text-ink shadow-card"
    >
      <Icon name={icone} />
    </button>
  )
}

/**
 * Mapa 3D do shopping (RF10), um piso por vez: os pisos têm escalas diferentes. Abre na loja de
 * ?loja=<mapaId> (o produto e a reserva mandam para cá), com a rota da entrada até ela. Tocar
 * numa loja troca o destino. Carregada sob demanda (three.js), fora do pacote principal.
 */
export default function Mapa() {
  const [params, setParams] = useSearchParams()
  const destino = params.get('loja') ?? undefined
  // Nomes das lojas ativas: sem eles (carregando ou sem rede), o mapa mostra todas como lojas.
  const lojas = useDados(listarLojas)
  const dados = lojas.tipo === 'ok' ? lojas.dados : undefined
  const nomes = useMemo(() => dados && Object.fromEntries(dados.itens.map((l) => [l.mapaId, l.nome])), [dados])
  // Destino novo começa do zero (piso da loja, câmera voando até ela).
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
  const abas = useRef<(HTMLButtonElement | null)[]>([])
  const controle = useRef<ControleDoMapa>(null)
  const rota = destino ? rotaAte(destino) : null
  const nome = destino ? nomes?.[destino] : undefined
  const daLoja = nome ?? 'a loja'

  // Setas do teclado trocam de piso, como numa lista de abas.
  function aoTeclar(evento: KeyboardEvent) {
    if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return
    const proximo: Piso = piso === 1 ? 2 : 1
    setPiso(proximo)
    abas.current[proximo - 1]?.focus()
  }

  const descricao =
    rota && achado?.piso === piso
      ? `Mapa do ${nomeDoPiso(piso).toLowerCase()} com a rota da entrada até ${daLoja}, ${Math.round(rota.metros)} metros.`
      : `Mapa do ${nomeDoPiso(piso).toLowerCase()} do Capim Dourado Shopping.`

  return (
    <div className="flex flex-col gap-4 px-4 py-6 md:h-full">
      <title>{nome ? `Rota até ${nome} · ${APP_NOME}` : `Mapa · ${APP_NOME}`}</title>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-sm text-ink-muted">{nome ? 'Rota até' : 'Mapa do shopping'}</p>
          <h1 className="mt-0.5 text-title-md">{nome ?? (destino ? 'Rota até a loja' : 'Mapa')}</h1>
        </div>
        <div role="tablist" aria-label="Piso" className="flex flex-none rounded-pill bg-surface-sunken p-1">
          {PISOS.map((n) => (
            <button
              key={n}
              ref={(el) => {
                abas.current[n - 1] = el
              }}
              type="button"
              role="tab"
              id={`aba-piso-${n}`}
              aria-selected={piso === n}
              aria-controls="planta"
              tabIndex={piso === n ? 0 : -1}
              onClick={() => setPiso(n)}
              onKeyDown={aoTeclar}
              className={cx(
                'cursor-pointer rounded-pill border-0 px-3 py-2 text-label',
                piso === n ? 'bg-marrom text-on-marrom' : 'bg-transparent text-ink-muted',
              )}
            >
              {nomeDoPiso(n)}
            </button>
          ))}
        </div>
      </header>

      <div id="planta" role="tabpanel" aria-labelledby={`aba-piso-${piso}`} className="relative md:min-h-0 md:flex-1">
        <div
          role="img"
          aria-label={descricao}
          className="h-[58dvh] min-h-[300px] overflow-hidden rounded-lg bg-surface-sunken md:h-full"
        >
          <Mapa3D piso={piso} destino={destino} nomes={nomes} onSelecionarLoja={aoEscolher} controle={controle} />
        </div>
        {/* Fora do role="img", para o leitor de tela achar os botões. */}
        <div className="absolute right-3 top-3 z-30 flex flex-col gap-2">
          <BotaoDoMapa rotulo="Aproximar" icone="mais" onClick={() => controle.current?.aproximar()} />
          <BotaoDoMapa rotulo="Afastar" icone="menos" onClick={() => controle.current?.afastar()} />
          <BotaoDoMapa
            rotulo={rota && achado?.piso === piso ? 'Voltar para a rota' : 'Ver o piso inteiro'}
            icone="alvo"
            onClick={() => controle.current?.recentralizar()}
          />
        </div>
      </div>

      <div className="flex flex-col items-start gap-2">
        {rota && achado?.piso === piso && (
          <Badge tone="ouro" icon="pin">
            {minutosAPe(rota.metros)} min a pé · {Math.round(rota.metros)} m
          </Badge>
        )}
        <p className="text-body-sm text-ink-muted">
          {!destino
            ? 'Toque numa loja para ver o caminho, ou peça à Capi. Arraste para girar e use dois dedos para aproximar.'
            : !achado
              ? 'Essa loja ainda não está na planta.'
              : achado.piso !== piso
                ? `${nome ?? 'A loja'} fica no ${nomeDoPiso(achado.piso).toLowerCase()}: troque o piso para ver a rota.`
                : 'Saindo da entrada mais próxima. Arraste para girar o mapa.'}
        </p>
      </div>
    </div>
  )
}
