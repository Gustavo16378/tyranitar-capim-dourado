import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { listarLojas, useDados, useSessao } from '../api'
import { Badge, Button, Icon, type IconName } from '../componentes'
import { cx } from '../componentes/cx'
import { APP_NOME } from '../config'
import { acharNaPlanta, rotaAte } from '../mapa/dados'
import {
  acharEntrada,
  armazemDoNavegador,
  entradasDoPiso,
  escolhaLembrada,
  lembrarEscolha,
  MAIS_PROXIMA,
  type Entrada,
} from '../mapa/entradas'
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
 * ?loja=<mapaId> (o produto e a reserva mandam para cá), com a rota até ela. Tocar numa loja
 * troca o destino. Na primeira rota, pergunta por qual entrada o cliente chegou e lembra a
 * resposta; ?origem=<entrada> (o QR de cada entrada) já responde. Sem resposta, a rota sai da
 * entrada mais próxima. Carregada sob demanda (three.js), fora do pacote principal.
 */
export default function Mapa() {
  const [params, setParams] = useSearchParams()
  const destino = params.get('loja') ?? undefined
  const doLink = acharEntrada(params.get('origem'))
  // Nomes das lojas ativas: sem eles (carregando ou sem rede), o mapa mostra todas como lojas.
  const lojas = useDados(listarLojas)
  const dados = lojas.tipo === 'ok' ? lojas.dados : undefined
  const nomes = useMemo(() => dados && Object.fromEntries(dados.itens.map((l) => [l.mapaId, l.nome])), [dados])
  // Destino novo começa do zero (piso da loja, câmera voando até ela).
  return (
    <MapaAte
      key={destino ?? ''}
      destino={destino}
      doLink={doLink}
      nomes={nomes}
      aoEscolher={(mapaId) => setParams({ loja: mapaId, ...(doLink ? { origem: doLink.id } : {}) }, { replace: true })}
    />
  )
}

/** A pergunta da primeira rota: por qual entrada do piso o cliente chegou. */
function PerguntaDaEntrada({ entradas, aoEscolher }: { entradas: Entrada[]; aoEscolher: (escolha: string) => void }) {
  return (
    <section aria-labelledby="titulo-entrada" className="flex flex-col gap-3 rounded-md border bg-surface-raised p-4">
      <div>
        <h2 id="titulo-entrada" className="text-label">
          Por qual entrada você chegou?
        </h2>
        <p className="mt-1 text-body-sm text-ink-muted">As entradas estão marcadas no mapa. A rota sai de onde você está.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {entradas.map((entrada) => (
          <Button key={entrada.id} size="sm" variant="secondary" onClick={() => aoEscolher(entrada.id)}>
            {entrada.nome}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => aoEscolher(MAIS_PROXIMA)}>
          Não sei
        </Button>
      </div>
    </section>
  )
}

function MapaAte({
  destino,
  doLink,
  nomes,
  aoEscolher,
}: {
  destino?: string
  /** A entrada do QR (?origem=): vale como resposta da pergunta. */
  doLink?: Entrada
  nomes?: Record<string, string>
  aoEscolher: (mapaId: string) => void
}) {
  const achado = destino ? acharNaPlanta(destino) : undefined
  const [piso, setPiso] = useState<Piso>(achado?.piso ?? doLink?.piso ?? 1)
  const abas = useRef<(HTMLButtonElement | null)[]>([])
  const controle = useRef<ControleDoMapa>(null)
  // A entrada por onde o cliente chegou, em cada piso: a do QR, a lembrada ou nenhuma ainda.
  const [escolhas, setEscolhas] = useState<Partial<Record<Piso, string>>>(() => {
    const armazem = armazemDoNavegador()
    const lembradas: Partial<Record<Piso, string>> = {}
    for (const n of PISOS) lembradas[n] = escolhaLembrada(n, armazem) ?? undefined
    if (doLink) lembradas[doLink.piso] = doLink.id
    return lembradas
  })
  useEffect(() => {
    if (doLink) lembrarEscolha(doLink.piso, doLink.id, armazemDoNavegador())
  }, [doLink])

  function escolher(escolha: string | undefined) {
    if (escolha) lembrarEscolha(piso, escolha, armazemDoNavegador())
    setEscolhas((atuais) => ({ ...atuais, [piso]: escolha }))
  }

  const entradaDoPiso = (n: Piso) => {
    const escolha = escolhas[n]
    return escolha && escolha !== MAIS_PROXIMA ? acharEntrada(escolha) : undefined
  }
  const naRota = achado ? entradaDoPiso(achado.piso) : undefined
  const aqui = entradaDoPiso(piso)
  const rota = destino ? rotaAte(destino, naRota?.id) : null
  const nome = destino ? nomes?.[destino] : undefined
  const daLoja = nome ?? 'a loja'
  const naTela = Boolean(rota && achado?.piso === piso)
  const perguntar = naTela && escolhas[piso] === undefined
  // O mapa abre sem login (o QR da entrada); quem não entrou vê o convite para entrar e volta aqui.
  const visitante = useSessao()?.usuario.perfil !== 'CLIENTE'
  const { pathname, search } = useLocation()

  // Setas do teclado trocam de piso, como numa lista de abas.
  function aoTeclar(evento: KeyboardEvent) {
    if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return
    const proximo: Piso = piso === 1 ? 2 : 1
    setPiso(proximo)
    abas.current[proximo - 1]?.focus()
  }

  const descricao =
    rota && naTela
      ? `Mapa do ${nomeDoPiso(piso).toLowerCase()} com a rota da ${naRota?.nome ?? 'entrada mais próxima'} até ${daLoja}, ${Math.round(rota.metros)} metros.`
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

      {perguntar && <PerguntaDaEntrada entradas={entradasDoPiso(piso)} aoEscolher={escolher} />}

      <div id="planta" role="tabpanel" aria-labelledby={`aba-piso-${piso}`} className="relative md:min-h-0 md:flex-1">
        <div
          role="img"
          aria-label={descricao}
          className="h-[58dvh] min-h-[300px] overflow-hidden rounded-lg bg-surface-sunken md:h-full"
        >
          <Mapa3D
            piso={piso}
            destino={destino}
            nomes={nomes}
            origem={aqui?.id}
            onSelecionarLoja={aoEscolher}
            controle={controle}
          />
        </div>
        {/* Fora do role="img", para o leitor de tela achar os botões. */}
        <div className="absolute right-3 top-3 z-30 flex flex-col gap-2">
          <BotaoDoMapa rotulo="Aproximar" icone="mais" onClick={() => controle.current?.aproximar()} />
          <BotaoDoMapa rotulo="Afastar" icone="menos" onClick={() => controle.current?.afastar()} />
          <BotaoDoMapa
            rotulo={naTela ? 'Voltar para a rota' : 'Ver o piso inteiro'}
            icone="alvo"
            onClick={() => controle.current?.recentralizar()}
          />
        </div>
      </div>

      <div className="flex flex-col items-start gap-2">
        {rota && naTela && (
          <Badge tone="ouro" icon="pin">
            {minutosAPe(rota.metros)} min a pé · {Math.round(rota.metros)} m
          </Badge>
        )}
        <p className="text-body-sm text-ink-muted">
          {!destino
            ? // Sem login, a Capi não está à mão: o convite embaixo leva até ela.
              `${aqui ? `Você está na ${aqui.nome}. ` : ''}Toque numa loja para ver o caminho${visitante ? '' : ', ou peça à Capi'}. Arraste para girar e use dois dedos para aproximar.`
            : !achado
              ? 'Essa loja ainda não está na planta.'
              : achado.piso !== piso
                ? `${nome ?? 'A loja'} fica no ${nomeDoPiso(achado.piso).toLowerCase()}: troque o piso para ver a rota.`
                : `Saindo da ${naRota?.nome ?? 'entrada mais próxima'}. Arraste para girar o mapa.`}
        </p>
        {naTela && escolhas[piso] !== undefined && (
          <Button size="sm" variant="ghost" onClick={() => escolher(undefined)}>
            Trocar a entrada
          </Button>
        )}
        {visitante && (
          <Link
            to="/entrar"
            state={{ de: pathname + search }}
            className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-line-strong px-4 text-label text-marrom-ink"
          >
            <Icon name="seta" className="size-4" />
            Entrar para reservar e falar com a Capi
          </Link>
        )}
      </div>
    </div>
  )
}
