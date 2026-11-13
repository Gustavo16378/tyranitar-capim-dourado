/**
 * De onde vem cada recurso: 'mock' (src/api/mocks, no formato do docs/api.md) ou 'api' (as rotas
 * de functions/api). Quando a rota de um recurso ficar pronta, troque para 'api' aqui; as telas
 * não mudam. Cada um pode ser trocado sozinho: os mocks que dependem do catálogo (Capi, favoritos
 * e reservas) leem os produtos pela fonte atual.
 */
export const FONTE = {
  /** POST /api/auth/login (Fase 2) e POST /api/auth/demo. Com mock, as duas entram como a Ana. */
  auth: 'api',
  /** GET /api/produtos e /api/produtos/{id}: prontos na Fase 2. */
  produtos: 'api',
  /** GET /api/ofertas: pronto na Fase 2. */
  ofertas: 'api',
  /** GET /api/me/favoritos. */
  favoritos: 'api',
  /** POST /api/reservas, GET /api/reservas/{id} e o pagamento. Precisam de login de cliente. */
  reservas: 'api',
  /** GET /api/me/carteira. Precisa de login de cliente. */
  carteira: 'api',
  /** POST /api/chat (Fase 5). */
  chat: 'api',
} satisfies Record<string, 'mock' | 'api'>

export type Recurso = keyof typeof FONTE

export function usarMock(recurso: Recurso) {
  // Lido como 'mock' | 'api', não como o valor de agora: com tudo em 'api', o TypeScript
  // acusaria a comparação de impossível.
  const fontes: Record<Recurso, 'mock' | 'api'> = FONTE
  return fontes[recurso] === 'mock'
}
