// Configuração editável pelo shopping (tabela configuracao, valores em JSON).
import { lerLimites } from '../regras/niveis'
import { PRAZOS_PADRAO, type PrazosReserva } from '../regras/reserva'
import { lerJson } from '../texto'

export async function lerConfiguracao(db: D1Database, chave: string): Promise<unknown> {
  const linha = await db.prepare('SELECT valor FROM configuracao WHERE chave = ?1').bind(chave).first<{ valor: string }>()
  return lerJson<unknown>(linha?.valor, null)
}

/** Limites de nível (RN08); o que faltar na configuração usa o padrão. */
export async function lerLimitesNivel(db: D1Database) {
  return lerLimites(await lerConfiguracao(db, 'niveis'))
}

/** Prazos da reserva em horas (RN01, RN02); o que faltar usa o padrão. */
export async function lerPrazosReserva(db: D1Database): Promise<PrazosReserva> {
  const valor = await lerConfiguracao(db, 'prazo_reserva_horas')
  const prazos = { ...PRAZOS_PADRAO }
  if (valor && typeof valor === 'object') {
    for (const forma of ['NA_LOJA', 'PIX'] as const) {
      const horas = (valor as Record<string, unknown>)[forma]
      if (typeof horas === 'number' && horas > 0) prazos[forma] = horas
    }
  }
  return prazos
}
