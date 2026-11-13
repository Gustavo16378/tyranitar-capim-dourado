/**
 * De onde vem cada recurso: 'mock' (src/api/mocks, no formato do docs/api.md) ou 'api' (as rotas
 * de functions/api). Quando a rota de um recurso ficar pronta, troque para 'api' aqui; as telas
 * não mudam.
 */
export const FONTE = {
  /** POST /api/auth/login (Fase 2). Com mock, a sessão é a da Ana, cliente de teste. */
  auth: 'mock',
  /** GET /api/produtos e /api/produtos/{id} (Fase 2). */
  produtos: 'mock',
  /** GET /api/ofertas (Fase 2). */
  ofertas: 'mock',
  /** GET /api/me/favoritos: ainda não está no api.md (só PUT e DELETE). */
  favoritos: 'mock',
  /** POST /api/reservas e /api/reservas/{id}/pagamento. */
  reservas: 'mock',
  /** GET /api/me/carteira. */
  carteira: 'mock',
  /** POST /api/chat (Fase 5). */
  chat: 'mock',
} satisfies Record<string, 'mock' | 'api'>

export type Recurso = keyof typeof FONTE

export function usarMock(recurso: Recurso) {
  return FONTE[recurso] === 'mock'
}
