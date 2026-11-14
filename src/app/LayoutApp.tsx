import { useRef } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { gsap } from 'gsap'
import { useSessao } from '../api'
import { BottomNav, type AbaId } from '../componentes'
import { cx } from '../componentes/cx'
import { comMovimento, DURACAO, EASE, useGSAP } from '../movimento'
import { AvisoDosSalvos } from './AvisoDosSalvos'
import { BarraLateral } from './BarraLateral'

/** As abas do app do cliente, na ordem da barra (a busca fica com a Capi). */
const ABAS: AbaId[] = ['inicio', 'salvos', 'capi', 'mapa', 'carteira']

/**
 * Telas abertas a qualquer visitante, sem login: o mapa (o QR de cada entrada abre
 * /mapa?origem=...). Reservar, a Capi e a carteira continuam pedindo login.
 */
const TELAS_PUBLICAS = ['/mapa']

/** A aba marcada é a primeira parte do caminho. Produto, Reserva e Conta não são abas: nenhuma fica marcada. */
function abaDaRota(caminho: string): AbaId {
  const primeiro = caminho.split('/')[1]
  return ABAS.find((aba) => aba === primeiro) ?? 'busca'
}

/**
 * Largura de cada tela a partir de 768 px (no celular, todas ocupam a coluna): o mapa usa a área
 * toda; a Capi, uma coluna larga; o Início, a grade de produtos; as outras, uma coluna de leitura.
 */
function larguraDaTela(caminho: string) {
  const tela = caminho.split('/')[1]
  if (tela === 'mapa') return 'h-full'
  if (tela === 'capi') return 'h-full md:max-w-3xl'
  if (tela === 'inicio') return 'md:max-w-5xl'
  if (tela === 'carteira' || tela === 'salvos') return 'md:max-w-3xl'
  return 'md:max-w-2xl'
}

/**
 * Casca do app do cliente. No celular: uma coluna, a tela rolando no meio e a BottomNav fixa
 * embaixo. A partir de 768 px: a barra lateral no lugar da BottomNav e a tela na largura dela.
 * A cada troca de tela, ela entra deslizando 16 px. Sem sessão de cliente, manda para o login e
 * volta para a mesma tela depois; só o mapa abre sem login, numa casca sem a navegação (as outras
 * abas pedem login).
 */
export default function LayoutApp() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const sessao = useSessao()
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

  if (sessao?.usuario.perfil !== 'CLIENTE') {
    if (!TELAS_PUBLICAS.includes(pathname)) return <Navigate to="/entrar" replace state={{ de: pathname + search }} />
    return (
      <div className="flex h-dvh flex-col bg-surface">
        <main
          ref={palco}
          tabIndex={0}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden focus-visible:-outline-offset-2"
        >
          <div className={cx('mx-auto w-full md:max-w-none', larguraDaTela(pathname))}>
            <Outlet />
          </div>
        </main>
      </div>
    )
  }

  const aba = abaDaRota(pathname)
  return (
    <div className="flex h-dvh bg-surface">
      <BarraLateral ativo={aba} naConta={pathname.startsWith('/conta')} />
      <div className="mx-auto flex min-w-0 max-w-md flex-1 flex-col md:max-w-none">
        {/* Focável: a área rola, e uma tela sem botão nem link (a Carteira sem reservas) também
            precisa rolar pelo teclado (WCAG 2.1.1). O anel fica por dentro, para não ser cortado. */}
        <main
          ref={palco}
          tabIndex={0}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden focus-visible:-outline-offset-2"
        >
          <div className={cx('mx-auto w-full', larguraDaTela(pathname))}>
            <Outlet />
          </div>
        </main>
        {/* O aviso do coração de salvar (o leitor de tela lê; o de erro aparece na tela). */}
        <AvisoDosSalvos />
        <div className="flex-none bg-surface-raised pb-[env(safe-area-inset-bottom)] md:hidden [&>nav]:rounded-none">
          <BottomNav abas={ABAS} ativo={aba} onSelect={(destino) => navigate(`/${destino}`)} />
        </div>
      </div>
    </div>
  )
}
