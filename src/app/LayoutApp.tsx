import { useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { gsap } from 'gsap'
import { BottomNav, type AbaId } from '../componentes'
import { comMovimento, DURACAO, EASE, useGSAP } from '../movimento'

/** As abas do app do cliente, na ordem da barra (a busca fica com a Capi). */
const ABAS: AbaId[] = ['inicio', 'capi', 'mapa', 'carteira']

/** A aba marcada é a primeira parte do caminho. Produto e Reserva não são abas: nenhuma fica marcada. */
function abaDaRota(caminho: string): AbaId {
  const primeiro = caminho.split('/')[1]
  return ABAS.find((aba) => aba === primeiro) ?? 'busca'
}

/**
 * Casca do app do cliente: uma coluna de celular (centralizada no computador), a tela rolando
 * no meio e a BottomNav fixa embaixo. A cada troca de tela, ela entra deslizando 16 px.
 */
export default function LayoutApp() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const palco = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const el = palco.current
      if (!el) return
      el.scrollTop = 0
      const mm = comMovimento(
        () => {
          gsap.fromTo(
            el,
            { opacity: 0, x: 16 },
            { opacity: 1, x: 0, duration: DURACAO.media, ease: EASE.saida, clearProps: 'transform' },
          )
        },
        () => {},
      )
      return () => mm.revert()
    },
    { dependencies: [pathname], revertOnUpdate: true },
  )

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-surface md:border-x">
      <main ref={palco} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
      <div className="flex-none bg-surface-raised pb-[env(safe-area-inset-bottom)] [&>nav]:rounded-none">
        <BottomNav abas={ABAS} ativo={abaDaRota(pathname)} onSelect={(aba) => navigate(`/${aba}`)} />
      </div>
    </div>
  )
}
