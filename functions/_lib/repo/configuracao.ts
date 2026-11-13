// Configuração editável pelo shopping (tabela configuracao, valores em JSON).
import { lerLimites } from '../regras/niveis'
import { lerJson } from '../texto'

export async function lerConfiguracao(db: D1Database, chave: string): Promise<unknown> {
  const linha = await db.prepare('SELECT valor FROM configuracao WHERE chave = ?1').bind(chave).first<{ valor: string }>()
  return lerJson<unknown>(linha?.valor, null)
}

/** Limites de nível (RN08); o que faltar na configuração usa o padrão. */
export async function lerLimitesNivel(db: D1Database) {
  return lerLimites(await lerConfiguracao(db, 'niveis'))
}
