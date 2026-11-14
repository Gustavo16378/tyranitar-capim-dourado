// Os avisos do app (GET /api/me/notificacoes): cada mudança da reserva e os pontos de uma compra.
// Um estado só, para o Início (a lista e o selo) e para a navegação (o selo da Carteira). Quem
// confere de tempos em tempos é o hook useAvisos (src/app/useAvisos.ts); aqui não há DOM.
import type { Notificacoes, TipoDeNotificacao } from '../tipos'
import { requisitar } from './cliente'

let atual: Notificacoes | null = null
const ouvintes = new Set<() => void>()

function avisar() {
  ouvintes.forEach((ouvinte) => ouvinte())
}

/** Busca os avisos de novo. Sem rede, fica o que já havia. */
export async function atualizarAvisos() {
  try {
    atual = await requisitar<Notificacoes>('GET', '/api/me/notificacoes')
    avisar()
  } catch {
    // Sem conexão ou sessão vencida: o selo fica como estava; a próxima rodada tenta de novo.
  }
}

/** POST /api/me/notificacoes/lidas: todos, ou só os de um tipo (a Carteira marca os de reserva). */
export async function marcarAvisosComoLidos(tipo?: TipoDeNotificacao) {
  if (!atual) return
  const sobra = tipo === 'RESERVA' ? atual.naoLidas.reservas : atual.naoLidas.total
  if (!sobra) return
  // Otimista: o selo some na hora; a lista certa chega em seguida.
  atual = {
    itens: atual.itens.map((n) => (!tipo || n.tipo === tipo ? { ...n, lida: true } : n)),
    naoLidas: tipo === 'RESERVA' ? { total: atual.naoLidas.total - sobra, reservas: 0 } : { total: 0, reservas: 0 },
  }
  avisar()
  try {
    await requisitar('POST', '/api/me/notificacoes/lidas', tipo ? { tipo } : {})
  } finally {
    await atualizarAvisos()
  }
}

/** Esquece os avisos (ao sair da conta). */
export function esquecerAvisos() {
  atual = null
  avisar()
}

/** Para o useSyncExternalStore do hook (src/app/useAvisos.ts). */
export function assinarAvisos(ouvinte: () => void) {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

export const avisosAtuais = () => atual
