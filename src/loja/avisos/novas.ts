// O aviso de reserva nova do painel da loja, sem DOM nem rede: quais reservas pendentes são novas
// desde a última consulta, as frases do aviso e a preferência do som. Quem consulta a API a cada
// 20 s, toca o som e anuncia é o AvisoDeReservas.tsx. Testado em tests/unidade/loja-avisos.test.ts.

/** De quanto em quanto tempo o painel pergunta pelas reservas pendentes. */
export const INTERVALO_DO_AVISO_MS = 20_000

/** Quantas pendentes a consulta traz: dá para reconhecer as novas até esse número na fila. */
export const PENDENTES_POR_CONSULTA = 50

/** O que o aviso precisa de cada reserva pendente. */
export interface Pendente {
  id: string
  produto: string
  cliente: string
}

/** O que o painel já viu: os ids das pendentes e quantas eram. */
export interface Vistas {
  ids: ReadonlySet<string>
  pendentes: number
}

export interface Conferencia {
  vistas: Vistas
  /** As que apareceram desde a última consulta, na ordem da API. Vazia na primeira. */
  novas: Pendente[]
}

/**
 * Compara a resposta de agora com o que o painel já viu. A primeira consulta (sem `antes`) só
 * guarda o que existe: reserva que já estava lá quando o painel abriu não é nova, e não toca o
 * som. Depois, nova é a pendente com um id que o painel nunca viu. Os ids vistos ficam guardados
 * (uma reserva não volta a ser pendente), então confirmar uma e ver a próxima subir na fila não
 * conta como reserva nova.
 */
export function conferirPendentes(antes: Vistas | null, agora: { itens: readonly Pendente[]; pendentes: number }): Conferencia {
  const ids = new Set(antes?.ids)
  const novas = antes ? agora.itens.filter((r) => !ids.has(r.id)) : []
  for (const r of agora.itens) ids.add(r.id)
  return { vistas: { ids, pendentes: agora.pendentes }, novas }
}

/** "Reserva nova: Camiseta dry-fit para Ana." ou "2 reservas novas: Tênis para Ana e Bolsa para Bia." */
export function fraseDasNovas(novas: readonly Pendente[]) {
  if (!novas.length) return ''
  const descritas = novas.map((r) => `${r.produto} para ${r.cliente}`)
  if (descritas.length === 1) return `Reserva nova: ${descritas[0]}.`
  const nomes = descritas.length > 3 ? [...descritas.slice(0, 3), `mais ${descritas.length - 3}`] : descritas
  return `${novas.length} reservas novas: ${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}.`
}

/** O selo do menu, para o leitor de tela: "1 reserva nova", "3 reservas novas". */
export function rotuloDoSelo(pendentes: number) {
  return pendentes === 1 ? '1 reserva nova' : `${pendentes} reservas novas`
}

// ---------- A preferência do som ----------

const CHAVE_DO_SOM = 'loja.somDeReservaNova'

/** O que o aviso usa do localStorage (os testes passam um de mentira). */
export interface Armazem {
  getItem(chave: string): string | null
  setItem(chave: string, valor: string): void
}

/** O som vem ligado; só fica desligado se a loja desligou neste aparelho. */
export function somLigado(armazem: Armazem | undefined) {
  try {
    return armazem?.getItem(CHAVE_DO_SOM) !== 'desligado'
  } catch {
    return true
  }
}

/** Guarda a escolha. Sem localStorage (aba anônima, bloqueado), vale só até fechar o painel. */
export function guardarSom(ligado: boolean, armazem: Armazem | undefined) {
  try {
    armazem?.setItem(CHAVE_DO_SOM, ligado ? 'ligado' : 'desligado')
  } catch {
    // Sem onde guardar: a escolha dura até a aba fechar.
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
