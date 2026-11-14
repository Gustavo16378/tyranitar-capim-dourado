import { useState } from 'react'
import { gsap } from 'gsap'
import { obterCarteira, useDados, useSessao } from '../api'
import { CarteiraQR, CupomTicket, NIVEIS, NivelBadge, ProgressoNivel } from '../componentes'
import { APP_NOME } from '../config'
import { modoTirano } from '../easter-egg/modoTirano'
import { useModoTirano } from '../easter-egg/useModoTirano'
import { comMovimento, DURACAO, EASE, encherBarra, somarPontos, subirDeNivel, useEntrada, useGSAP } from '../movimento'
import { desdeAUltimaVista, guardarVista, lerVista } from './carteiraVista'
import { Carregando, ErroTela, Esqueleto, Vazio } from './Estados'
import { dataCurta, descontoDoCupom, INICIO_DO_NIVEL, paraNivel } from './formatos'
import { MinhasReservas } from './MinhasReservas'

/** O cupom que só o modo tirano mostra: de demonstração, não vale no caixa e some ao acender as luzes. */
const CUPOM_DO_TIRANO = {
  titulo: 'TYRANITAR13',
  loja: 'Loja 13 · cupom de demonstração',
  desconto: '13%',
  validade: 'acender as luzes',
} as const

/**
 * Carteira: o QR do cliente para o balcão, pontos, progresso de nível, reservas e cupons. No modo
 * tirano (docs/easter-egg.md), o nível secreto Tirano, acima do Dourado: o selo, a subida de nível
 * uma vez por sessão e o cupom de demonstração TYRANITAR13. Nada disso vai para a API.
 */
export default function Carteira() {
  const usuario = useSessao()?.usuario
  const carteira = useDados(obterCarteira, 'carteira')
  const { ligado: tirano } = useModoTirano()
  // A subida para o Tirano é celebrada na primeira visita depois do apagão, e só nela.
  const [celebrarTirano] = useState(() => modoTirano.estado().ligado && !modoTirano.estado().nivelVisto)
  // O que o cliente viu na última visita, lido uma vez só, antes de a tela guardar o de agora.
  const [antes] = useState(() => (usuario ? lerVista(usuario.id) : null))
  const mudou =
    carteira.tipo === 'ok'
      ? desdeAUltimaVista(antes, { pontos: carteira.dados.pontos, nivel: carteira.dados.nivel })
      : null
  // O título entra na hora; o resto, quando a carteira chega.
  const topo = useEntrada<HTMLHeadingElement>()
  const tela = useEntrada<HTMLDivElement>([carteira.tipo])

  // Os movimentos da marca na carteira:
  // - subiu de nível: a barra enche e o selo novo entra com a espiral girando (conquista);
  // - pontos novos: o número conta desde a última visita e o cartão dá um quique;
  // - nada novo: o cartão do QR entra com um quique e a barra enche, como no protótipo.
  useGSAP(
    () => {
      if (carteira.tipo !== 'ok' || !tela.current) return
      // Nível Tirano: a única conquista da tela é ele (a barra não existe: é o nível mais alto).
      if (celebrarTirano) {
        const selo = tela.current.querySelector('[data-selo-tirano]')
        const efeito = selo ? subirDeNivel(selo) : null
        modoTirano.marcarNivelVisto()
        return () => efeito?.revert()
      }
      if (!mudou) return
      const { pontos, nivel } = carteira.dados
      const raiz = tela.current
      const cartao = raiz.querySelector('[aria-label="Carteira"]')
      const qr = raiz.querySelector('[data-carteira-qr]')
      const numero = raiz.querySelector('[data-carteira-pontos]')
      const barra = raiz.querySelector('[data-progresso-barra]')
      const selo = raiz.querySelector('[data-selo-novo]')
      const efeitos: gsap.MatchMedia[] = []

      if (mudou.subiu && selo) {
        efeitos.push(subirDeNivel(selo, { barra }))
        if (numero) efeitos.push(somarPontos(numero, { de: mudou.de, ate: pontos }))
      } else {
        if (mudou.somou && numero) {
          efeitos.push(somarPontos(numero, { de: mudou.de, ate: pontos, destaque: cartao }))
        } else if (qr) {
          efeitos.push(
            comMovimento(
              () => {
                gsap.fromTo(
                  qr,
                  { scale: 0.85, rotate: -4 },
                  { scale: 1, rotate: 0, duration: DURACAO.lenta, ease: EASE.mola },
                )
              },
              () => {},
            ),
          )
        }
        if (barra) efeitos.push(encherBarra(barra, { atraso: 0.2 }))
      }
      if (usuario) guardarVista(usuario.id, { pontos, nivel })
      return () => efeitos.forEach((efeito) => efeito.revert())
    },
    { scope: tela, dependencies: [carteira.tipo], revertOnUpdate: true },
  )

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <title>{`Carteira · ${APP_NOME}`}</title>
      <h1 ref={topo} className="text-title-lg">
        <span data-anim className="block">
          Sua carteira
        </span>
      </h1>
      <div ref={tela} className="flex flex-col gap-5">
        {carteira.tipo === 'carregando' && (
          <Carregando className="flex flex-col gap-5">
            <Esqueleto className="h-[400px] rounded-lg" />
            <Esqueleto className="h-[92px]" />
            <Esqueleto className="h-6 w-32" />
            <Esqueleto className="h-[104px]" />
          </Carregando>
        )}

        {carteira.tipo === 'erro' && <ErroTela erro={carteira.erro} onTentar={carteira.recarregar} />}

        {carteira.tipo === 'ok' && (
          <>
            {tirano && celebrarTirano && (
              <div data-anim role="status" className="flex items-center gap-3 rounded-md bg-ouro-soft p-4 text-ouro-ink">
                <span data-selo-tirano className="flex-none">
                  <NivelBadge nivel="tirano" />
                </span>
                <p className="text-label">Você subiu para o nível Tirano, o nível secreto acima do Dourado.</p>
              </div>
            )}
            {!celebrarTirano && mudou?.subiu && (
              <div
                data-anim
                role="status"
                className="flex items-center gap-3 rounded-md bg-ouro-soft p-4 text-ouro-ink"
              >
                <span data-selo-novo className="flex-none">
                  <NivelBadge nivel={paraNivel(carteira.dados.nivel)} />
                </span>
                <p className="text-label">Você subiu para o nível {NIVEIS[paraNivel(carteira.dados.nivel)]}!</p>
              </div>
            )}
            <div data-anim>
              <CarteiraQR
                nome={usuario?.nome ?? 'Cliente'}
                nivel={tirano ? 'tirano' : paraNivel(carteira.dados.nivel)}
                pontos={carteira.dados.pontos}
                qrToken={carteira.dados.qrToken}
              />
            </div>

            <div data-anim className="rounded-md border bg-surface-raised p-4">
              {tirano ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-body-sm text-ink-muted">Nível secreto, acima do Dourado. Só o tirano libera.</p>
                  <NivelBadge nivel="tirano" />
                </div>
              ) : carteira.dados.proximoNivel ? (
                <ProgressoNivel
                  pontos={carteira.dados.pontos}
                  inicio={INICIO_DO_NIVEL[paraNivel(carteira.dados.nivel)]}
                  fim={carteira.dados.pontos + carteira.dados.proximoNivel.faltam}
                  nivel={paraNivel(carteira.dados.nivel)}
                  proximo={paraNivel(carteira.dados.proximoNivel.nivel)}
                />
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-body-sm text-ink-muted">Você está no nível mais alto.</p>
                  <NivelBadge nivel={paraNivel(carteira.dados.nivel)} />
                </div>
              )}
            </div>

            <div data-anim>
              <MinhasReservas reservas={carteira.dados.reservasAtivas} />
            </div>

            <section data-anim aria-labelledby="titulo-cupons" className="flex flex-col gap-3">
              <h2 id="titulo-cupons" className="text-title-sm text-marrom-ink">
                Seus cupons
              </h2>
              {carteira.dados.cupons.length === 0 && !tirano ? (
                <Vazio>Você ainda não tem cupons. As ofertas do Início aparecem aqui quando valem para você.</Vazio>
              ) : (
                <ul className="flex flex-col gap-3 pt-2.5 md:grid md:grid-cols-2">
                  {tirano && (
                    <li>
                      <CupomTicket origem="loja" nivel="tirano" {...CUPOM_DO_TIRANO} />
                    </li>
                  )}
                  {carteira.dados.cupons.map((cupom) => (
                    <li key={cupom.id}>
                      <CupomTicket
                        origem={cupom.loja ? 'loja' : 'shopping'}
                        titulo={cupom.titulo}
                        loja={cupom.loja ?? undefined}
                        desconto={descontoDoCupom(cupom)}
                        validade={dataCurta(cupom.validade)}
                        nivel={cupom.nivelMinimo === 'SEMENTE' ? undefined : paraNivel(cupom.nivelMinimo)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
