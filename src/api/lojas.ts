import type { LojaDoProduto, Lista } from '../tipos'
import { requisitar } from './cliente'

/** GET /api/lojas: as lojas ativas (até 200, todas cabem numa página). O mapa usa nome e mapaId. */
export function listarLojas() {
  return requisitar<Lista<LojaDoProduto>>('GET', '/api/lojas?tamanho=200')
}
