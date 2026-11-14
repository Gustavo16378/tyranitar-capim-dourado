import { Link } from 'react-router'
import { useSessao } from '../api'
import { CapiMark, Icon, type AbaId, type IconName } from '../componentes'
import { cx } from '../componentes/cx'
import { APP_NOME } from '../config'
import { primeiroNome } from './formatos'

const ITENS: { aba: AbaId; rotulo: string; icone?: IconName }[] = [
  { aba: 'inicio', rotulo: 'Início', icone: 'casa' },
  { aba: 'salvos', rotulo: 'Salvos para provar', icone: 'coracao' },
  { aba: 'capi', rotulo: 'Capi' },
  { aba: 'mapa', rotulo: 'Mapa', icone: 'mapa' },
  { aba: 'carteira', rotulo: 'Carteira', icone: 'carteira' },
]

const ITEM =
  'flex items-center gap-3 rounded-sm px-3 py-2.5 text-label transition-colors duration-instante motion-reduce:transition-none'

/**
 * Navegação do app a partir de 768 px: a barra lateral faz o papel da BottomNav, com as mesmas
 * abas, e a Minha conta embaixo. No celular ela some (e a BottomNav aparece).
 */
export function BarraLateral({ ativo, naConta }: { ativo: AbaId; naConta: boolean }) {
  const usuario = useSessao()?.usuario
  return (
    <nav
      aria-label="Navegação principal"
      className="hidden w-56 flex-none flex-col gap-1 border-r bg-surface-raised p-4 md:flex lg:w-64"
    >
      <div className="mb-6 flex items-center gap-3 px-2">
        <span className="grid size-10 flex-none place-items-center rounded-full bg-terra">
          <CapiMark className="size-[26px]" />
        </span>
        <span className="text-title-sm">{APP_NOME}</span>
      </div>
      <ul className="flex flex-col gap-1">
        {ITENS.map(({ aba, rotulo, icone }) => {
          const atual = aba === ativo
          return (
            <li key={aba}>
              <Link
                to={`/${aba}`}
                aria-current={atual ? 'page' : undefined}
                className={cx(
                  ITEM,
                  atual ? 'bg-marrom-soft text-marrom-ink' : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
                )}
              >
                {icone ? (
                  <Icon name={icone} />
                ) : (
                  <span className="grid size-5 place-items-center rounded-full bg-terra">
                    <CapiMark className="size-4" />
                  </span>
                )}
                {rotulo}
              </Link>
            </li>
          )
        })}
      </ul>
      <Link
        to="/conta"
        aria-current={naConta ? 'page' : undefined}
        className={cx(
          ITEM,
          'mt-auto',
          naConta ? 'bg-marrom-soft text-marrom-ink' : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
        )}
      >
        <span
          aria-hidden="true"
          className="grid size-8 flex-none place-items-center rounded-full bg-terra text-label text-on-terra"
        >
          {usuario ? primeiroNome(usuario.nome).charAt(0).toUpperCase() : '?'}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-ink">{usuario?.nome ?? 'Minha conta'}</span>
          <span className="text-caption text-ink-muted">Minha conta</span>
        </span>
      </Link>
    </nav>
  )
}
