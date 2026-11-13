// Nível de fidelidade do cliente (RN08): pelos pontos ganhos nos últimos 12 meses.
// O saldo (usuario.pontos) é outra coisa: é o que o cliente tem para usar.
import { paraSqlite } from '../regras/datas'
import { inicioDaJanelaDoNivel, nivelPorPontos, proximoNivel } from '../regras/niveis'
import { lerLimitesNivel } from './configuracao'

/** Soma dos pontos das compras do cliente a partir de uma data. */
export async function pontosGanhosDesde(db: D1Database, clienteId: string, desde: Date) {
  const linha = await db
    .prepare('SELECT COALESCE(SUM(pontos_gerados), 0) AS pontos FROM compra WHERE cliente_id = ?1 AND criado_em >= ?2')
    .bind(clienteId, paraSqlite(desde))
    .first<{ pontos: number }>()
  return linha?.pontos ?? 0
}

export async function nivelDoCliente(db: D1Database, clienteId: string, agora = new Date()) {
  const [limites, pontosNoAno] = await Promise.all([
    lerLimitesNivel(db),
    pontosGanhosDesde(db, clienteId, inicioDaJanelaDoNivel(agora)),
  ])
  return {
    nivel: nivelPorPontos(pontosNoAno, limites),
    pontosNoAno,
    proximo: proximoNivel(pontosNoAno, limites),
    limites,
  }
}
