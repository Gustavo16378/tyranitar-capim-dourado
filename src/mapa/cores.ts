// O three.js não lê var(--token): o mapa pega o valor de cada token de cor no CSS e acompanha a
// troca de tema (prefers-color-scheme e data-theme). Nenhuma cor fica escrita no código.
import { useEffect, useState } from 'react'

const TOKENS = {
  loja: 'mapa-loja',
  alimentacao: 'mapa-alimentacao',
  destaque: 'mapa-destaque',
  vaga: 'surface-sunken',
  piso: 'surface-raised',
  borda: 'line-strong',
  rota: 'marrom',
  voce: 'cerrado',
  texto: 'ink',
  entrada: 'ink-muted',
  // O mapa no escuro do easter egg (docs/easter-egg.md): a trilha de rachaduras e a lanterna.
  rachadura: 'ouro',
  lanterna: 'on-terra',
} as const

/** No escuro, o contorno das lojas vem num token mais claro, para separar uma loja da outra. */
const TOKENS_NO_ESCURO: Partial<Record<keyof typeof TOKENS, string>> = { borda: 'ink-muted', entrada: 'ink' }

export type CoresDoMapa = Record<keyof typeof TOKENS, string>

/** O tema em uso: data-theme manda; sem ele, a preferência do sistema. */
function temaEscuro() {
  const tema = document.documentElement.dataset.theme
  if (tema) return tema === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * As cores do tema em uso, ou as de um tema pedido: o mapa no escuro pinta as lojas com as cores
 * do tema claro, sob a luz apagada, para a lanterna mostrar cada uma como ela é.
 */
function lerCores(tema?: 'light'): CoresDoMapa {
  // Um bloco com data-theme lê os tokens daquele tema (tokens.css vale em qualquer bloco).
  const amostra = tema ? document.body.appendChild(Object.assign(document.createElement('div'), { hidden: true })) : null
  amostra?.setAttribute('data-theme', tema!)
  const estilo = getComputedStyle(amostra ?? document.documentElement)
  const escuro = tema ? false : temaEscuro()
  const cores = Object.fromEntries(
    Object.entries(TOKENS).map(([nome, token]) => {
      const doTema = (escuro && TOKENS_NO_ESCURO[nome as keyof typeof TOKENS]) || token
      return [nome, estilo.getPropertyValue(`--${doTema}`).trim()]
    }),
  ) as CoresDoMapa
  amostra?.remove()
  return cores
}

export function useCoresDoMapa(tema?: 'light'): CoresDoMapa {
  const [cores, setCores] = useState(() => lerCores(tema))
  useEffect(() => {
    const atualizar = () => setCores(lerCores(tema))
    atualizar()
    const sistema = window.matchMedia('(prefers-color-scheme: dark)')
    sistema.addEventListener('change', atualizar)
    const observador = new MutationObserver(atualizar)
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      sistema.removeEventListener('change', atualizar)
      observador.disconnect()
    }
  }, [tema])
  return cores
}
