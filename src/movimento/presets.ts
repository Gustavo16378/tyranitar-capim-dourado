// Os quatro movimentos da marca. Cada preset roda dentro de gsap.matchMedia(): com
// prefers-reduced-motion vira um fade de duracao-rapida (ou nada), e troca sozinho se a
// preferência mudar. Todos devolvem o MatchMedia; chame revert() para desfazer.
// Num componente, chame dentro do useGSAP e devolva () => mm.revert().
import { gsap } from 'gsap'
import { formatarNumero } from '../componentes/formatar'
import {
  DESLOCAMENTO,
  DURACAO,
  EASE,
  MOVIMENTO_NORMAL,
  MOVIMENTO_REDUZIDO,
  PASSO_CASCATA,
} from './tokens'

/** Roda `normal` ou `reduzido` conforme prefers-reduced-motion. Base de todos os presets. */
export function comMovimento(normal: () => void, reduzido: () => void): gsap.MatchMedia {
  const mm = gsap.matchMedia()
  mm.add(MOVIMENTO_NORMAL, normal)
  mm.add(MOVIMENTO_REDUZIDO, reduzido)
  return mm
}

/**
 * 1. A trança se desenha: o fio da espiral aparece do centro para fora e a marca gira até
 * o lugar. Usado na Abertura e onde a Capi se apresenta.
 */
export function desenharTranca(
  fio: SVGGeometryElement,
  { marca, aoTerminar }: { marca?: Element | null; aoTerminar?: () => void } = {},
) {
  return comMovimento(
    () => {
      const comprimento = fio.getTotalLength()
      const tl = gsap.timeline({ onComplete: aoTerminar })
      tl.fromTo(
        fio,
        { strokeDasharray: comprimento, strokeDashoffset: comprimento },
        { strokeDashoffset: 0, duration: DURACAO.lenta, ease: EASE.suave },
      )
      if (marca) {
        tl.fromTo(
          marca,
          { rotate: -120, scale: 0.7 },
          { rotate: 0, scale: 1, duration: DURACAO.lenta, ease: EASE.saida },
          0,
        )
      }
    },
    () => {
      gsap.fromTo(marca ?? fio, { opacity: 0 }, { opacity: 1, duration: DURACAO.rapida, onComplete: aoTerminar })
    },
  )
}

/**
 * 2. Cards em cascata: cada alvo sobe 24 px e aparece, 60 ms depois do anterior (expo.out).
 * Para telas inteiras, use o hook useEntrada, que aplica isto aos elementos com data-anim.
 */
export function cascata(alvos: gsap.TweenTarget, { atraso = 0 }: { atraso?: number } = {}) {
  return comMovimento(
    () => {
      gsap.fromTo(
        alvos,
        { y: DESLOCAMENTO, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: DURACAO.media,
          ease: EASE.saida,
          stagger: PASSO_CASCATA,
          delay: atraso,
        },
      )
    },
    () => {
      gsap.fromTo(alvos, { opacity: 0 }, { opacity: 1, duration: DURACAO.rapida })
    },
  )
}

/**
 * 3. Pontos somando: o número conta de `de` até `ate`, e o `destaque` (o recibo, a carteira)
 * entra com um pequeno quique. O elemento do número deve ter só o texto do número
 * (escreva {`+${pontos}`}, não +{pontos}), para o React continuar dono do texto.
 */
export function somarPontos(
  numero: Element,
  { de = 0, ate, prefixo = '', destaque }: { de?: number; ate: number; prefixo?: string; destaque?: Element | null },
) {
  const escrever = (valor: number) => {
    const texto = prefixo + formatarNumero(Math.round(valor))
    const unico = numero.childNodes.length === 1 ? numero.firstChild : null
    if (unico?.nodeType === Node.TEXT_NODE) unico.nodeValue = texto
    else numero.textContent = texto
  }
  return comMovimento(
    () => {
      const contador = { valor: de }
      escrever(de)
      if (destaque) {
        gsap.fromTo(
          destaque,
          { y: 20, opacity: 0, scale: 0.96 },
          { y: 0, opacity: 1, scale: 1, duration: DURACAO.media, ease: EASE.mola },
        )
      }
      gsap.to(contador, {
        valor: ate,
        duration: DURACAO.lenta,
        ease: EASE.suave,
        onUpdate: () => escrever(contador.valor),
      })
    },
    () => {
      escrever(ate)
      if (destaque) gsap.fromTo(destaque, { opacity: 0 }, { opacity: 1, duration: DURACAO.rapida })
    },
  )
}

/**
 * Barra de progresso enchendo a partir da esquerda (carteira, painel). Não é conquista:
 * quando o nível muda, use subirDeNivel.
 */
export function encherBarra(barra: Element, { atraso = 0 }: { atraso?: number } = {}) {
  return comMovimento(
    () => {
      gsap.fromTo(
        barra,
        { scaleX: 0, transformOrigin: 'left center' },
        { scaleX: 1, duration: DURACAO.lenta, ease: EASE.suave, delay: atraso },
      )
    },
    () => {},
  )
}

/**
 * 4. Subiu de nível: a barra (se houver) enche, e o selo novo entra com um quique enquanto a
 * espiral gira, terminando junto com duracao-celebracao. Conquista: no máximo uma por tela.
 */
export function subirDeNivel(selo: Element, { barra }: { barra?: Element | null } = {}) {
  return comMovimento(
    () => {
      const tl = gsap.timeline()
      const inicio = barra ? DURACAO.celebracao - DURACAO.lenta : 0
      if (barra) {
        tl.fromTo(
          barra,
          { scaleX: 0, transformOrigin: 'left center' },
          { scaleX: 1, duration: DURACAO.lenta, ease: EASE.suave },
        )
      }
      tl.fromTo(
        selo,
        { scale: 0.6, opacity: 0 },
        { scale: 1, opacity: 1, duration: DURACAO.media, ease: EASE.mola },
        inicio,
      )
      const espiral = selo.querySelector('svg')
      if (espiral) {
        tl.fromTo(espiral, { rotate: -180 }, { rotate: 0, duration: DURACAO.lenta, ease: EASE.saida }, inicio)
      }
    },
    () => {
      gsap.fromTo(selo, { opacity: 0 }, { opacity: 1, duration: DURACAO.rapida })
    },
  )
}
