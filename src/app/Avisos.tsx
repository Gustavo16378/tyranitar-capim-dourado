import { useState } from 'react'
import { Link } from 'react-router'
import { marcarAvisosComoLidos } from '../api'
import { Icon } from '../componentes'
import { cx } from '../componentes/cx'
import { Folha } from './Folha'
import { haQuantoTempo, numeroDoSelo } from './formatos'
import { useAvisos } from './useAvisos'

/**
 * Os avisos do app no Início: o sino com quantos são novos e, tocando, a lista (cada mudança da
 * reserva, os pontos de uma compra). Abrir marca todos como lidos; os que eram novos ficam em
 * destaque até fechar. Cada aviso leva à tela dele.
 */
export function Avisos() {
  const avisos = useAvisos(true)
  const [aberta, setAberta] = useState(false)
  const [novos, setNovos] = useState<string[]>([])
  const naoLidos = avisos?.naoLidas.total ?? 0

  function abrir() {
    setNovos(avisos?.itens.filter((n) => !n.lida).map((n) => n.id) ?? [])
    setAberta(true)
    void marcarAvisosComoLidos()
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label={naoLidos ? `Avisos, ${naoLidos} ${naoLidos === 1 ? 'novo' : 'novos'}` : 'Avisos'}
        className="relative grid size-11 flex-none cursor-pointer place-items-center rounded-full border border-line-strong bg-surface-raised text-ink"
      >
        <Icon name="sino" />
        {naoLidos > 0 && (
          <span
            aria-hidden="true"
            data-selo-avisos
            className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-pill bg-marrom px-1 text-caption font-semibold text-on-marrom"
          >
            {numeroDoSelo(naoLidos)}
          </span>
        )}
      </button>
      <Folha aberta={aberta} onFechar={() => setAberta(false)} titulo="Avisos">
        {!avisos?.itens.length ? (
          <p className="text-body-sm text-ink-muted">
            Nenhum aviso por enquanto. Quando a loja confirmar a sua reserva, o aviso aparece aqui.
          </p>
        ) : (
          <ul className="-mx-1 flex max-h-[60dvh] flex-col gap-2 overflow-y-auto px-1">
            {avisos.itens.map((aviso) => {
              const novo = novos.includes(aviso.id)
              const conteudo = (
                <>
                  <span className="flex items-baseline justify-between gap-3">
                    <span className={cx('text-label', novo && 'text-marrom-ink')}>
                      {novo && <span className="sr-only">Novo: </span>}
                      {aviso.titulo}
                    </span>
                    <span className="flex-none text-caption text-ink-muted">{haQuantoTempo(aviso.criadoEm)}</span>
                  </span>
                  <span className="block text-body-sm text-ink-muted">{aviso.corpo}</span>
                </>
              )
              const estilo = cx('block rounded-md border p-3 text-ink', novo ? 'border-marrom bg-marrom-soft' : 'bg-surface')
              return (
                <li key={aviso.id}>
                  {aviso.destino ? (
                    <Link to={aviso.destino} onClick={() => setAberta(false)} className={cx(estilo, 'no-underline')}>
                      {conteudo}
                    </Link>
                  ) : (
                    <div className={estilo}>{conteudo}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Folha>
    </>
  )
}
