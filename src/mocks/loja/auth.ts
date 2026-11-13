// A conferência do token nas rotas /api/loja que ainda respondem com mocks. Elas aceitam o
// token do login real (só leem o perfil e o exp).
import { exigirPerfil } from '../comum/token'
import type { PedidoMock, RespostaMock } from '../comum/resposta'

export function exigirLojista(pedido: PedidoMock): RespostaMock | null {
  return exigirPerfil(pedido, 'LOJISTA', 'painel da loja')
}
