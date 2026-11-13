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
} as const

export type CoresDoMapa = Record<keyof typeof TOKENS, string>

function lerCores(): CoresDoMapa {
  const estilo = getComputedStyle(document.documentElement)
  return Object.fromEntries(
    Object.entries(TOKENS).map(([nome, token]) => [nome, estilo.getPropertyValue(`--${token}`).trim()]),
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
