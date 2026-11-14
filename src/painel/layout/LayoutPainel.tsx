import { Suspense, useId, useRef, useState, type KeyboardEvent } from 'react'
import { NavLink, Outlet } from 'react-router'
import { cx } from '../../componentes/cx'
import { SeletorDeAparencia } from '../../tema/SeletorDeAparencia'
import { Carregando, Esqueleto } from '../comum/Estados'
import { urlNoPainel, usePainel } from '../painel'

// Itens da barra lateral, sobre terra. A aba ativa ganha fundo claro translúcido e negrito;
// o foco usa on-terra, porque o focus-ring some sobre o terra.
const ITEM =
  'flex min-h-11 items-center whitespace-nowrap rounded-sm px-3 text-body-sm font-medium text-on-terra ' +
  'opacity-80 transition-[background-color,opacity] duration-instante ease-saida hover:opacity-100 ' +
  'focus-visible:outline-on-terra'
const ATIVO = 'bg-[color-mix(in_srgb,var(--on-terra)_12%,transparent)] font-semibold opacity-100'

/** As três barras do botão de menu; viram um X com o menu aberto. */
function IconeMenu({ aberto }: { aberto: boolean }) {
  const barra = 'absolute left-0 h-0.5 w-full rounded-pill bg-current transition-transform duration-rapida motion-reduce:transition-none'
  return (
    <span aria-hidden="true" className="relative block h-3.5 w-[18px]">
      <span className={cx(barra, 'top-0', aberto && 'translate-y-1.5 rotate-45')} />
      <span className={cx(barra, 'top-1.5', aberto && 'opacity-0')} />
      <span className={cx(barra, 'top-3', aberto && '-translate-y-1.5 -rotate-45')} />
    </span>
  )
}

/**
 * Moldura de um painel: as telas e, ao lado, a tela aberta. A partir de 1024 px, a barra lateral
 * fica sempre à vista. Abaixo disso (celular e tablet), uma barra no topo com o botão Menu, que
 * abre a navegação embaixo dela; escolher uma tela ou apertar Esc fecha.
 */
export function LayoutPainel() {
  const painel = usePainel()
  const atual = painel.sessao.useSessao()
  const [aberto, setAberto] = useState(false)
  const idMenu = useId()
  const botao = useRef<HTMLButtonElement>(null)

  function fecharComEsc(evento: KeyboardEvent) {
    if (evento.key !== 'Escape' || !aberto) return
    setAberto(false)
    botao.current?.focus()
  }

  return (
    <div className="min-h-dvh bg-surface text-ink lg:grid lg:grid-cols-[220px_minmax(0,1fr)] print:block print:min-h-0 print:bg-white">
      {/* Na impressão (QR das entradas), só a tela: sem a barra lateral nem as margens. */}
      <aside
        onKeyDown={fecharComEsc}
        className="sticky top-0 z-20 flex flex-col bg-terra px-3 text-on-terra lg:h-dvh lg:gap-6 lg:py-6 print:hidden"
      >
        <div className="flex min-h-14 items-center justify-between gap-3 lg:min-h-0">
          <p className="px-2 text-caption font-semibold uppercase tracking-wider opacity-[.85]">{painel.nome}</p>
          <button
            ref={botao}
            type="button"
            aria-expanded={aberto}
            aria-controls={idMenu}
            onClick={() => setAberto((a) => !a)}
            className={cx(ITEM, 'cursor-pointer gap-2 opacity-100 lg:hidden')}
          >
            <IconeMenu aberto={aberto} />
            {aberto ? 'Fechar' : 'Menu'}
          </button>
        </div>

        <div
          id={idMenu}
          className={cx(
            'flex-col gap-4 pb-4 lg:flex lg:flex-1 lg:gap-6 lg:pb-0',
            // Aberto no celular: a lista pode passar da altura da tela e rola por dentro.
            aberto ? 'flex max-h-[calc(100dvh-3.5rem)] overflow-y-auto' : 'hidden',
            'lg:max-h-none lg:overflow-visible',
          )}
        >
          <nav aria-label="Telas do painel">
            <ul className="flex flex-col gap-1">
              {painel.telas.map(({ caminho, rotulo }) => (
                <li key={caminho}>
                  <NavLink
                    to={urlNoPainel(painel, caminho)}
                    onClick={() => setAberto(false)}
                    className={({ isActive }) => cx(ITEM, 'gap-2', isActive && ATIVO)}
                  >
                    {rotulo}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-3 border-t border-[color-mix(in_srgb,var(--on-terra)_20%,transparent)] px-2 pt-3 lg:mt-auto">
            <SeletorDeAparencia sobre="terra" />
          </div>
          <div className="flex items-center justify-between gap-2 px-2 lg:flex-col lg:items-start">
            <span className="min-w-0 truncate text-body-sm opacity-[.85]">{atual?.usuario.nome}</span>
            <button type="button" onClick={painel.sessao.apagarSessao} className={cx(ITEM, '-mx-3 cursor-pointer')}>
              Sair
            </button>
          </div>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-[1120px] px-4 py-6 md:px-8 md:py-8 print:max-w-none print:p-0">
        {/* Para as telas carregadas sob demanda (lazy na lista de telas do painel). */}
        <Suspense
          fallback={
            <Carregando rotulo="Carregando a tela" className="flex flex-col gap-6">
              <Esqueleto className="h-16 max-w-[480px]" />
              <Esqueleto className="h-64" />
            </Carregando>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
