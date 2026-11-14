// Os gatilhos do easter egg "O tirano da sexta-feira 13" (docs/easter-egg.md): a palavra que a
// Capi entende sem chamar a IA e os 13 toques (no CapiMark da Capi e no seletor de piso do mapa).
// Funções puras, testadas em tests/unidade/easter-egg.test.ts.

/** O nome da equipe. Mandado sozinho para a Capi, acorda a Capi Tirana. */
export const PALAVRA_DO_TIRANO = 'tyranitar'

/**
 * A mensagem é só a palavra do tirano? Sem diferenciar maiúsculas e sem contar os espaços nas
 * pontas. A palavra no meio de uma frase não conta: a pergunta segue para a Capi de verdade.
 */
export function ehPalavraDoTirano(texto: string) {
  return texto.trim().toLowerCase() === PALAVRA_DO_TIRANO
}

/** Quantos toques seguidos abrem um segredo. */
export const TOQUES_DO_SEGREDO = 13

/** Uma pausa maior que esta entre dois toques recomeça a contagem. */
export const PAUSA_MAXIMA_MS = 2_000

export interface ContadorDeToques {
  /** Conta um toque no instante `agora` (ms). true no toque que completa a série; aí recomeça. */
  tocar: (agora: number) => boolean
  /** Toques contados na série atual. */
  readonly toques: number
}

/** Conta toques seguidos: `alvo` toques sem pausa maior que `pausaMaximaMs` entre eles. */
export function criarContadorDeToques(alvo = TOQUES_DO_SEGREDO, pausaMaximaMs = PAUSA_MAXIMA_MS): ContadorDeToques {
  let toques = 0
  let ultimo = -Infinity
  return {
    tocar(agora) {
      toques = agora - ultimo > pausaMaximaMs ? 1 : toques + 1
      ultimo = agora
      if (toques < alvo) return false
      toques = 0
      ultimo = -Infinity
      return true
    },
    get toques() {
      return toques
    },
  }
}
