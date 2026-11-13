// As entradas de cada piso, com o nome da pergunta "Por qual entrada você chegou?" e das etiquetas
// do mapa, e a memória dessa escolha. O id é o ponto de entrada do grafo (src/mapa/rotas.json):
// o QR de cada entrada abre /mapa?origem=<id> e o mapa já sai dali. Os nomes vão em letras, da
// esquerda para a direita no mapa; quando o shopping passar os nomes de verdade (por exemplo,
// "Entrada principal"), é só trocar aqui.
import type { Piso } from './grafo'

export interface Entrada {
  id: string
  piso: Piso
  nome: string
}

export const ENTRADAS: readonly Entrada[] = [
  { id: 'p1-c34', piso: 1, nome: 'Entrada A' },
  { id: 'p1-c116', piso: 1, nome: 'Entrada B' },
  { id: 'p1-c1', piso: 1, nome: 'Entrada C' },
  { id: 'p2-c4', piso: 2, nome: 'Entrada D' },
  { id: 'p2-c1', piso: 2, nome: 'Entrada E' },
  { id: 'p2-c14', piso: 2, nome: 'Entrada F' },
  { id: 'p2-c12', piso: 2, nome: 'Entrada G' },
]

export const entradasDoPiso = (piso: Piso) => ENTRADAS.filter((e) => e.piso === piso)

export const acharEntrada = (id: string | null | undefined) => ENTRADAS.find((e) => e.id === id)

/** A resposta "não sei": a rota sai da entrada mais próxima, sem perguntar de novo. */
export const MAIS_PROXIMA = 'mais-proxima'

/** A escolha vale por uma visita ao shopping: depois disso, o mapa pergunta de novo. */
export const VALIDADE_DA_ESCOLHA_MS = 6 * 60 * 60 * 1000

const CHAVE = 'capi.mapa.entrada'

/** O que o mapa usa do localStorage (os testes passam um de mentira). */
export interface Armazem {
  getItem(chave: string): string | null
  setItem(chave: string, valor: string): void
}

type Guardado = Partial<Record<string, { escolha: string; em: number }>>

function ler(armazem: Armazem | undefined): Guardado {
  try {
    const valor = JSON.parse(armazem?.getItem(CHAVE) ?? '{}')
    return valor && typeof valor === 'object' ? (valor as Guardado) : {}
  } catch {
    return {}
  }
}

/** A entrada escolhida neste piso (ou MAIS_PROXIMA), se a escolha ainda vale; senão, null. */
export function escolhaLembrada(piso: Piso, armazem: Armazem | undefined, agora = Date.now()): string | null {
  const guardada = ler(armazem)[piso]
  if (!guardada || agora - guardada.em > VALIDADE_DA_ESCOLHA_MS) return null
  if (guardada.escolha !== MAIS_PROXIMA && acharEntrada(guardada.escolha)?.piso !== piso) return null
  return guardada.escolha
}

/** Guarda a escolha do piso. Sem localStorage (aba anônima, bloqueado), o mapa só não lembra. */
export function lembrarEscolha(piso: Piso, escolha: string, armazem: Armazem | undefined, agora = Date.now()) {
  try {
    const guardado = ler(armazem)
    guardado[piso] = { escolha, em: agora }
    armazem?.setItem(CHAVE, JSON.stringify(guardado))
  } catch {
    // Sem onde guardar, a escolha vale só até sair da tela.
  }
}

/** O localStorage, se der para usar. */
export function armazemDoNavegador(): Armazem | undefined {
  try {
    return (globalThis as { localStorage?: Armazem }).localStorage
  } catch {
    return undefined
  }
}
