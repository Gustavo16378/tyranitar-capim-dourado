// O que aparece escrito sobre cada loja no mapa: o nome, para as lojas ativas, ou o número da
// planta, para as outras. Sem palavra, a vaga só se distinguiria pela cor.
import type { Ponto2D } from './svg'

/** "loja-209" → "209"; "loja-ancora-04" → "Âncora 04"; "loja-pc-04" → "PC 04"; "loja-05-a" → "05 A". */
export function numeroDaLoja(mapaId: string) {
  const codigo = mapaId.replace(/^loja-/, '')
  const ancora = codigo.match(/^anc(?:ora)?-?(.+)$/)
  if (ancora) return `Âncora ${ancora[1].replace(/-/g, ' ').toUpperCase()}`
  return codigo.replace(/-/g, ' ').toUpperCase()
}

/**
 * Rótulo da loja: o nome, se ela está entre as ativas; senão "Loja 209", e "· vaga" quando a
 * lista de ativas já chegou e ela não está nela.
 */
export function rotuloDaLoja(mapaId: string, nomes?: Record<string, string>) {
  const nome = nomes?.[mapaId]
  if (nome) return nome
  const numero = numeroDaLoja(mapaId)
  const rotulo = /^\d/.test(numero) ? `Loja ${numero}` : numero
  return nomes ? `${rotulo} · vaga` : rotulo
}

/** Área do polígono (fórmula do laço), em m², como a planta. */
export function areaDoPoligono(pontos: Ponto2D[]) {
  let dobro = 0
  for (let i = 0; i < pontos.length; i++) {
    const a = pontos[i]
    const b = pontos[(i + 1) % pontos.length]
    dobro += a.x * b.y - b.x * a.y
  }
  return Math.abs(dobro) / 2
}

/** Lojas grandes, que mostram o rótulo sempre: pelo menos 1/4 da área da maior loja do piso. */
export function lojasGrandes(lojas: { mapaId: string; pontos: Ponto2D[] }[], fracao = 0.25) {
  const areas = lojas.map((l) => ({ mapaId: l.mapaId, area: areaDoPoligono(l.pontos) }))
  const maior = Math.max(0, ...areas.map((a) => a.area))
  return new Set(areas.filter((a) => a.area >= maior * fracao).map((a) => a.mapaId))
}
