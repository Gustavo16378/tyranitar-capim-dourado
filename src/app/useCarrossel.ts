// Faixa que rola para o lado (os cupons do Início). No celular, o dedo desliza a faixa, como
// sempre. No computador, também: as setas (SetasDoCarrossel), arrastar com o mouse e a roda do
// mouse. O teclado continua com as setas do teclado, com a faixa em foco.
import { useCallback, useRef, useState, type DragEvent, type MouseEvent, type PointerEvent, type RefCallback } from 'react'
import { gsap } from 'gsap'
import { DURACAO, EASE, MOVIMENTO_REDUZIDO } from '../movimento'
import { aindaRola, alvoDaSeta, LIMIAR_DO_ARRASTE, rodaParaOLado } from './carrossel'

/** Se a faixa está no começo e no fim. As duas ao mesmo tempo: tudo cabe, as setas somem. */
export interface Pontas {
  inicio: boolean
  fim: boolean
}

interface Arraste {
  id: number
  x: number
  posicao: number
  ativo: boolean
}

/**
 * A área onde os cartões aparecem, sem o recuo (padding) dos lados, e onde cada cartão começa.
 * A faixa é `relative`: o offsetLeft dos cartões é medido nela, sem contar a rolagem.
 */
function medidas(el: HTMLElement) {
  const estilo = getComputedStyle(el)
  const recuo = parseFloat(estilo.paddingLeft) || 0
  const visivel = el.clientWidth - recuo - (parseFloat(estilo.paddingRight) || 0)
  const maximo = el.scrollWidth - el.clientWidth
  const cartoes = [...el.children].map((filho) => {
    const cartao = filho as HTMLElement
    return { inicio: cartao.offsetLeft - recuo, largura: cartao.offsetWidth }
  })
  return { visivel, maximo, cartoes }
}

export function useCarrossel() {
  const faixa = useRef<HTMLElement | null>(null)
  const arraste = useRef<Arraste | null>(null)
  const engolirClique = useRef(false)
  const [pontas, setPontas] = useState<Pontas>({ inicio: true, fim: true })
  const [arrastando, setArrastando] = useState(false)

  const medir = useCallback(() => {
    const el = faixa.current
    if (!el) return
    const maximo = el.scrollWidth - el.clientWidth
    const agora = { inicio: el.scrollLeft <= 1, fim: el.scrollLeft >= maximo - 1 }
    setPontas((antes) => (antes.inicio === agora.inicio && antes.fim === agora.fim ? antes : agora))
  }, [])

  // Ref de callback (React 19: devolve a limpeza): a faixa só aparece quando as ofertas chegam.
  const ref: RefCallback<HTMLElement> = useCallback(
    (el: HTMLElement | null) => {
      faixa.current = el
      if (!el) return
      medir()
      const observador = new ResizeObserver(medir)
      observador.observe(el)
      for (const filho of el.children) observador.observe(filho)

      // A roda para cima e para baixo anda a faixa para o lado. React registra onWheel como
      // passivo, e aqui é preciso o preventDefault: por isso o addEventListener.
      const naRoda = (evento: WheelEvent) => {
        const delta = rodaParaOLado(evento, el.clientWidth)
        if (!aindaRola(delta, el.scrollLeft, el.scrollWidth - el.clientWidth)) return
        evento.preventDefault()
        gsap.killTweensOf(el)
        el.scrollLeft += delta
      }
      el.addEventListener('scroll', medir, { passive: true })
      el.addEventListener('wheel', naRoda, { passive: false })
      return () => {
        observador.disconnect()
        el.removeEventListener('scroll', medir)
        el.removeEventListener('wheel', naRoda)
        gsap.killTweensOf(el)
        faixa.current = null
      }
    },
    [medir],
  )

  /** Uma seta: rola até o começo de um cartão, deslizando (ou na hora, com movimento reduzido). */
  const andar = useCallback((sentido: 1 | -1) => {
    const el = faixa.current
    if (!el) return
    const { cartoes, visivel, maximo } = medidas(el)
    const alvo = alvoDaSeta(cartoes, el.scrollLeft, visivel, maximo, sentido)
    gsap.killTweensOf(el)
    if (window.matchMedia(MOVIMENTO_REDUZIDO).matches) el.scrollLeft = alvo
    else gsap.to(el, { scrollLeft: alvo, duration: DURACAO.media, ease: EASE.saida })
  }, [])

  // Arrastar com o mouse. O toque fica com o navegador (rolagem nativa, com inércia).
  const onPointerDown = useCallback((evento: PointerEvent<HTMLElement>) => {
    const el = faixa.current
    if (!el || evento.pointerType !== 'mouse' || evento.button !== 0) return
    gsap.killTweensOf(el)
    arraste.current = { id: evento.pointerId, x: evento.clientX, posicao: el.scrollLeft, ativo: false }
  }, [])

  const onPointerMove = useCallback((evento: PointerEvent<HTMLElement>) => {
    const el = faixa.current
    const atual = arraste.current
    if (!el || !atual || atual.id !== evento.pointerId) return
    const dx = evento.clientX - atual.x
    if (!atual.ativo) {
      if (Math.abs(dx) < LIMIAR_DO_ARRASTE) return
      atual.ativo = true
      el.setPointerCapture(evento.pointerId)
      setArrastando(true)
    }
    el.scrollLeft = atual.posicao - dx
  }, [])

  const soltar = useCallback((evento: PointerEvent<HTMLElement>) => {
    const atual = arraste.current
    if (!atual || atual.id !== evento.pointerId) return
    arraste.current = null
    if (!atual.ativo) return
    faixa.current?.releasePointerCapture(evento.pointerId)
    setArrastando(false)
    // O clique que vem logo depois de soltar não abre nada: foi arraste.
    engolirClique.current = true
    setTimeout(() => (engolirClique.current = false))
  }, [])

  const onClickCapture = useCallback((evento: MouseEvent) => {
    if (!engolirClique.current) return
    engolirClique.current = false
    evento.preventDefault()
    evento.stopPropagation()
  }, [])

  return {
    pontas,
    arrastando,
    andar,
    /** Espalhe na faixa: <div {...carrossel.faixa}>. */
    faixa: {
      ref,
      onPointerDown,
      onPointerMove,
      onPointerUp: soltar,
      onPointerCancel: soltar,
      onClickCapture,
      // Imagem e link não saem arrastados (o navegador arrastaria a cópia deles).
      onDragStart: (evento: DragEvent) => evento.preventDefault(),
    },
  }
}

export type Carrossel = ReturnType<typeof useCarrossel>
