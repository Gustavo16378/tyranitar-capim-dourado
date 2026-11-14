import type { LojaAtiva, LojaDoProduto, Lista } from '../tipos'
import { requisitar } from './cliente'

/** GET /api/lojas: as lojas ativas (até 200, todas cabem numa página). O mapa usa nome e mapaId. */
export function listarLojas() {
  return requisitar<Lista<LojaDoProduto>>('GET', '/api/lojas?tamanho=200')
}

/** GET /api/lojas/{id}: uma loja ativa, para a página da loja. */
export function obterLoja(id: string) {
  return requisitar<LojaAtiva>('GET', `/api/lojas/${encodeURIComponent(id)}`)
}
