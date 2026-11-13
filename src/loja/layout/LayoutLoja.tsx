import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router'
import { Badge } from '../../componentes'
import { cx } from '../../componentes/cx'
import { MOCKS_LIGADOS, sessao } from '../api'
import { Carregando, Esqueleto } from '../../painel/comum/Estados'
import { urlDaTela } from '../enderecos'
import { TELAS_DA_LOJA } from '../navegacao'

// Itens da barra lateral, sobre terra. A aba ativa ganha fundo claro translúcido e negrito;
// o foco usa on-terra, porque o focus-ring some sobre o terra.
const ITEM =
  'flex min-h-11 items-center whitespace-nowrap rounded-sm px-3 text-body-sm font-medium text-on-terra ' +
  'opacity-80 transition-[background-color,opacity] duration-instante ease-saida hover:opacity-100 ' +
  'focus-visible:outline-on-terra'
const ATIVO = 'bg-[color-mix(in_srgb,var(--on-terra)_12%,transparent)] font-semibold opacity-100'

/** Moldura do painel: barra lateral com as telas e, ao lado, a tela aberta. */
export function LayoutLoja() {
  const atual = sessao.useSessao()

  return (
    <div className="min-h-dvh bg-surface text-ink md:grid md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-4 bg-terra px-3 py-4 text-on-terra md:sticky md:top-0 md:h-dvh md:gap-6 md:py-6">
        <div className="flex flex-wrap items-center justify-between gap-2 px-2">
          <p className="text-caption font-semibold uppercase tracking-wider opacity-[.85]">Painel da loja</p>
          {MOCKS_LIGADOS && <Badge>Dados de exemplo</Badge>}
        </div>

        <nav aria-label="Telas do painel" className="-mx-3 overflow-x-auto px-3 md:mx-0 md:overflow-visible md:px-0">
          <ul className="flex gap-1 md:flex-col">
            {TELAS_DA_LOJA.map(({ caminho, rotulo }) => (
              <li key={caminho}>
                <NavLink to={urlDaTela(caminho)} className={({ isActive }) => cx(ITEM, isActive && ATIVO)}>
                  {rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center justify-between gap-2 border-t border-[color-mix(in_srgb,var(--on-terra)_20%,transparent)] px-2 pt-3 md:mt-auto md:flex-col md:items-start">
          <span className="text-body-sm opacity-[.85]">{atual?.usuario.nome}</span>
          <button type="button" onClick={sessao.apagarSessao} className={cx(ITEM, '-mx-3 cursor-pointer')}>
            Sair
          </button>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-[1120px] px-4 py-6 md:px-8 md:py-8">
        {/* Para as telas carregadas sob demanda (navegacao.ts). */}
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
