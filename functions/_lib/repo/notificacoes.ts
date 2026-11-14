// SQL dos avisos do cliente (tabela notificacao): as mudanças das reservas, os pontos das compras.
import { deSqlite } from '../regras/datas'

export const TIPOS_DE_NOTIFICACAO = ['RESERVA', 'CUPOM', 'PONTOS', 'SISTEMA'] as const
export type TipoDeNotificacao = (typeof TIPOS_DE_NOTIFICACAO)[number]

interface NotificacaoLinha {
  id: string
  tipo: TipoDeNotificacao
  titulo: string
  corpo: string
  destino: string | null
  lida: 0 | 1
  criado_em: string
}

export async function listarNotificacoes(db: D1Database, clienteId: string, tamanho = 20) {
  const [itens, naoLidas] = await db.batch([
    db
      .prepare(
        `SELECT id, tipo, titulo, corpo, destino, lida, criado_em FROM notificacao
         WHERE usuario_id = ?1 ORDER BY criado_em DESC, rowid DESC LIMIT ?2`,
      )
      .bind(clienteId, tamanho),
    db
      .prepare(
        `SELECT count(*) AS total, COALESCE(sum(tipo = 'RESERVA'), 0) AS reservas
         FROM notificacao WHERE usuario_id = ?1 AND lida = 0`,
      )
      .bind(clienteId),
  ])
  const contagem = naoLidas.results[0] as { total: number; reservas: number }
  return {
    itens: (itens.results as NotificacaoLinha[]).map((n) => ({
      id: n.id,
      tipo: n.tipo,
      titulo: n.titulo,
      corpo: n.corpo,
      destino: n.destino,
      lida: n.lida === 1,
      criadoEm: deSqlite(n.criado_em).toISOString(),
    })),
    naoLidas: { total: contagem.total, reservas: contagem.reservas },
  }
}

/** Marca como lidos os avisos do cliente: todos, ou só os de um tipo. Devolve quantos mudaram. */
export async function marcarComoLidas(db: D1Database, clienteId: string, tipo?: TipoDeNotificacao) {
  const { meta } = await db
    .prepare(`UPDATE notificacao SET lida = 1 WHERE usuario_id = ?1 AND lida = 0${tipo ? ' AND tipo = ?2' : ''}`)
    .bind(...(tipo ? [clienteId, tipo] : [clienteId]))
    .run()
  return meta.changes
}
