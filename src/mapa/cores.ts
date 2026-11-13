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

function lerCores(): CoresDoMapa {
  const estilo = getComputedStyle(document.documentElement)
  const escuro = temaEscuro()
  return Object.fromEntries(
    Object.entries(TOKENS).map(([nome, token]) => {
      const doTema = (escuro && TOKENS_NO_ESCURO[nome as keyof typeof TOKENS]) || token
      return [nome, estilo.getPropertyValue(`--${doTema}`).trim()]
    }),
  ) as CoresDoMapa
}

export function useCoresDoMapa(): CoresDoMapa {
  const [cores, setCores] = useState(lerCores)
  useEffect(() => {
    const atualizar = () => setCores(lerCores())
    const tema = window.matchMedia('(prefers-color-scheme: dark)')
    tema.addEventListener('change', atualizar)
    const observador = new MutationObserver(atualizar)
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      tema.removeEventListener('change', atualizar)
      observador.disconnect()
    }
  }, [])
  return cores
}
