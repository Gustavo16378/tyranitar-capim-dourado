import { useRef, useState, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router'
import { Badge } from '../componentes'
import { cx } from '../componentes/cx'
import { APP_NOME } from '../config'
import { acharBloco, distancia, rotaAte } from '../mapa/planta'
import { Planta2D } from '../mapa/Planta2D'
import type { Piso } from '../tipos'
import { nomeDoPiso } from './formatos'

const PISOS: Piso[] = [1, 2]

/** Mapa: a planta do térreo e da praça de alimentação, com a loja destacada e a rota da entrada. */
export default function Mapa() {
  const [params] = useSearchParams()
  const destino = params.get('loja') ?? undefined
  // Destino novo começa do zero (piso da loja, animação de entrada).
  return <MapaAte key={destino ?? ''} destino={destino} />
}

function MapaAte({ destino }: { destino?: string }) {
  const achado = destino ? acharBloco(destino) : undefined
  const [piso, setPiso] = useState<Piso>(achado?.piso ?? 1)
  const abas = useRef<(HTMLButtonElement | null)[]>([])
  const rota = destino ? rotaAte(destino) : undefined
  const trajeto = rota && distancia(rota)

  // Setas do teclado trocam de piso, como numa lista de abas.
  function aoTeclar(evento: KeyboardEvent) {
    if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return
    const proximo: Piso = piso === 1 ? 2 : 1
    setPiso(proximo)
    abas.current[proximo - 1]?.focus()
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <title>{`Mapa · ${APP_NOME}`}</title>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-body-sm text-ink-muted">{achado ? 'Rota até' : 'Planta do shopping'}</p>
          <h1 className="mt-0.5 text-title-md">{achado ? achado.bloco.nome : 'Mapa'}</h1>
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

      <div id="planta" role="tabpanel" aria-labelledby={`aba-piso-${piso}`}>
        <Planta2D piso={piso} destino={achado ? destino : undefined} />
      </div>

      <div className="flex flex-col items-start gap-2">
        {trajeto && piso === 1 && (
          <Badge tone="ouro" icon="pin">
            {trajeto.minutos} min a pé · {trajeto.metros} m
          </Badge>
        )}
        {achado && achado.piso !== piso && (
          <p className="text-body-sm text-ink-muted">
            {achado.bloco.nome} fica no {nomeDoPiso(achado.piso).toLowerCase()}.
          </p>
        )}
        {destino && !achado && (
          <p className="text-body-sm text-ink-muted">Essa loja ainda não está na planta ilustrativa.</p>
        )}
        {!destino && <p className="text-body-sm text-ink-muted">Peça à Capi o caminho até uma loja.</p>}
        <p className="text-caption text-ink-muted">
          Planta ilustrativa. Na versão final o mapa é 3D (React Three Fiber) com a planta oficial.
        </p>
      </div>
    </div>
  )
}
