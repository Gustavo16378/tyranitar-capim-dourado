import type { CompraDoCliente, Lista } from '../tipos'
import { query, requisitar } from './cliente'

/** GET /api/me/compras: o histórico de compras do cliente, a mais nova primeiro (paginado). */
export function listarCompras(pagina: { pagina?: number; tamanho?: number } = {}) {
  return requisitar<Lista<CompraDoCliente>>('GET', `/api/me/compras${query(pagina)}`)
}
