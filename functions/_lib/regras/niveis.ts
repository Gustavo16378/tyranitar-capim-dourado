// RN08: níveis de fidelidade por pontos. Os limites vêm da configuração do shopping.
// O nível é calculado sobre o saldo de pontos do cliente (usuario.pontos).

export type NivelFidelidade = 'SEMENTE' | 'BROTO' | 'CAPIM' | 'DOURADO'
export type LimitesNivel = Record<NivelFidelidade, number>

export const ORDEM_NIVEIS: readonly NivelFidelidade[] = ['SEMENTE', 'BROTO', 'CAPIM', 'DOURADO']
export const LIMITES_PADRAO: LimitesNivel = { SEMENTE: 0, BROTO: 500, CAPIM: 2000, DOURADO: 5000 }

/** Os níveis na ordem dos limites, do menor para o maior. */
function emOrdem(limites: LimitesNivel) {
  return ORDEM_NIVEIS.map((nivel) => ({ nivel, limite: limites[nivel] })).sort((a, b) => a.limite - b.limite)
}

/** O nível mais alto cujo limite os pontos alcançam. */
export function nivelPorPontos(pontos: number, limites: LimitesNivel = LIMITES_PADRAO): NivelFidelidade {
  let atual: NivelFidelidade = 'SEMENTE'
  for (const { nivel, limite } of emOrdem(limites)) if (pontos >= limite) atual = nivel
  return atual
}

/** O próximo nível e quantos pontos faltam para ele; null no nível mais alto. */
export function proximoNivel(
  pontos: number,
  limites: LimitesNivel = LIMITES_PADRAO,
): { nivel: NivelFidelidade; limite: number; faltam: number } | null {
  const proximo = emOrdem(limites).find(({ limite }) => limite > pontos)
  return proximo ? { ...proximo, faltam: proximo.limite - pontos } : null
}

/** Se o nível do cliente alcança o nível mínimo pedido (cupons com nível mínimo). */
export function nivelAtende(nivelCliente: NivelFidelidade, nivelMinimo: NivelFidelidade) {
  return ORDEM_NIVEIS.indexOf(nivelCliente) >= ORDEM_NIVEIS.indexOf(nivelMinimo)
}

/** Lê os limites gravados na configuração; o que faltar ou vier errado usa o padrão. */
export function lerLimites(valor: unknown): LimitesNivel {
  const limites = { ...LIMITES_PADRAO }
  if (valor && typeof valor === 'object') {
    for (const nivel of ORDEM_NIVEIS) {
      const n = (valor as Record<string, unknown>)[nivel]
      if (typeof n === 'number' && Number.isFinite(n) && n >= 0) limites[nivel] = n
    }
  }
  return limites
}
