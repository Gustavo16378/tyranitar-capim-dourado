/**
 * De onde vem cada recurso: 'mock' (src/api/mocks, no formato do docs/api.md) ou 'api' (as rotas
 * de functions/api). Quando a rota de um recurso ficar pronta, troque para 'api' aqui; as telas
 * não mudam. Cada um pode ser trocado sozinho: os mocks que dependem do catálogo (Capi, favoritos
 * e reservas) leem os produtos pela fonte atual.
 */
export const FONTE = {
  /** POST /api/auth/login (Fase 2) e POST /api/auth/demo. Com mock, as duas entram como a Ana. */
  auth: 'mock',
  /** GET /api/produtos e /api/produtos/{id}: prontos na Fase 2. */
  produtos: 'mock',
  /** GET /api/ofertas: pronto na Fase 2. */
  ofertas: 'mock',
  /** GET /api/me/favoritos. */
  favoritos: 'mock',
  /** POST /api/reservas, GET /api/reservas/{id} e o pagamento. Precisam de login de cliente. */
  reservas: 'mock',
  /** GET /api/me/carteira. Precisa de login de cliente. */
  carteira: 'mock',
  /** POST /api/chat (Fase 5). */
  chat: 'mock',
} satisfies Record<string, 'mock' | 'api'>

export type Recurso = keyof typeof FONTE

export function usarMock(recurso: Recurso) {
  return FONTE[recurso] === 'mock'
}
