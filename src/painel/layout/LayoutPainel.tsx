import { Suspense, useId, useRef, useState, type KeyboardEvent } from 'react'
import { NavLink, Outlet } from 'react-router'
import { gsap } from 'gsap'
import { cx } from '../../componentes/cx'
import { comMovimento, DURACAO, EASE, useGSAP } from '../../movimento'
import { SeletorDeAparencia } from '../../tema/SeletorDeAparencia'
import { Carregando, Esqueleto } from '../comum/Estados'
import { numeroDoSelo, useContadores, type Contador } from '../contadores'
import { urlNoPainel, usePainel } from '../painel'

// Itens da barra lateral, sobre terra. A aba ativa ganha fundo claro translúcido e negrito;
// o foco usa on-terra, porque o focus-ring some sobre o terra.
const BASE_DO_ITEM =
  'flex min-h-11 items-center whitespace-nowrap rounded-sm px-3 text-body-sm font-medium text-on-terra ' +
  'transition-[background-color,opacity] duration-instante ease-saida focus-visible:outline-on-terra'
const ITEM = `${BASE_DO_ITEM} opacity-80 hover:opacity-100`
const ATIVO = 'bg-[color-mix(in_srgb,var(--on-terra)_12%,transparent)] font-semibold opacity-100'
// Nas telas, o texto fica mais claro e o selo não: com opacidade no item todo, o número do selo
// perderia contraste.
const TEXTO_DO_ITEM = 'opacity-80 transition-opacity duration-instante group-hover:opacity-100'

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
  const contadores = useContadores()
  // No botão Menu, a soma dos selos: no celular, a lista das telas fica escondida.
  const comSelo = painel.telas.flatMap(({ caminho }) => {
    const contador = contadores[caminho]
    return contador && contador.quantidade > 0 ? [contador] : []
  })
  const seloDoMenu: Contador | undefined = comSelo.length
    ? {
        quantidade: comSelo.reduce((soma, c) => soma + c.quantidade, 0),
        rotulo: comSelo.map((c) => c.rotulo).join(', '),
        chegadas: comSelo.reduce((soma, c) => soma + (c.chegadas ?? 0), 0),
      }
    : undefined
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
            aria-label={aberto ? undefined : comNumero('Menu', seloDoMenu)}
            onClick={() => setAberto((a) => !a)}
            className={cx(ITEM, 'cursor-pointer gap-2 opacity-100 lg:hidden')}
          >
            <IconeMenu aberto={aberto} />
            {aberto ? 'Fechar' : comEspaco('Menu', seloDoMenu)}
            {!aberto && seloDoMenu && <Selo contador={seloDoMenu} />}
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
              {painel.telas.map(({ caminho, rotulo }) => {
                const contador = contadores[caminho]
                return (
                  <li key={caminho}>
                    <NavLink
                      to={urlNoPainel(painel, caminho)}
                      onClick={() => setAberto(false)}
                      aria-label={comNumero(rotulo, contador)}
                      className={({ isActive }) => cx(BASE_DO_ITEM, 'group gap-2', isActive && ATIVO)}
                    >
                      {({ isActive }) => (
                        <>
                          <span className={cx(TEXTO_DO_ITEM, isActive && 'opacity-100')}>{comEspaco(rotulo, contador)}</span>
                          {contador && contador.quantidade > 0 && <Selo contador={contador} />}
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              })}
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

/**
 * O nome de um item com selo, para o leitor de tela: "Reservas, 2 reservas novas". Vai no aria-label,
 * e não num texto escondido ao lado: o item é flex, e o navegador poria um espaço antes da vírgula.
 */
function comNumero(nome: string, contador: Contador | undefined) {
  return contador && contador.quantidade > 0 ? `${nome}, ${contador.rotulo}` : undefined
}

/**
 * O texto visível do item, com um espaço no fim quando tem selo: quem confere se o nome contém o
 * texto visível (o axe, e quem fala o que vê para o leitor de voz) lê "Reservas 2", não "Reservas2".
 */
function comEspaco(nome: string, contador: Contador | undefined) {
  return contador && contador.quantidade > 0 ? `${nome} ` : nome
}

/**
 * O número ao lado de uma tela (as reservas novas da loja), em ouro sobre o terra. Quando chega
 * algo novo, o selo dá um pulo curto; com movimento reduzido, só o número muda.
 */
function Selo({ contador }: { contador: Contador }) {
  const ref = useRef<HTMLSpanElement>(null)
  const chegadasVistas = useRef(contador.chegadas ?? 0)

  useGSAP(
    () => {
      const chegadas = contador.chegadas ?? 0
      if (!ref.current || chegadas === chegadasVistas.current) return
      chegadasVistas.current = chegadas
      const selo = ref.current
      const mm = comMovimento(
        () => {
          gsap.fromTo(selo, { scale: 0.6 }, { scale: 1, duration: DURACAO.media, ease: EASE.mola })
        },
        () => {},
      )
      return () => mm.revert()
    },
    { dependencies: [contador.chegadas] },
  )

  // O leitor de tela ouve o rótulo pelo nome do item (comNumero); o número desenhado fica escondido dele.
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="ml-auto inline-grid h-6 min-w-6 place-items-center rounded-pill bg-ouro px-1.5 text-caption font-semibold tabular-nums text-on-ouro"
    >
      {numeroDoSelo(contador.quantidade)}
    </span>
  )
}
