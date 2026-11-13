// Acesso ao Claude. O resto da Capi depende só do tipo ModeloCapi, então os testes passam um
// modelo simulado com respostas gravadas e nunca chamam o Claude de verdade.
import Anthropic from '@anthropic-ai/sdk'

export type ParametrosDoModelo = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming
export type RespostaDoModelo = Anthropic.Beta.BetaMessage

export type ModeloCapi = (parametros: ParametrosDoModelo, opcoes: { signal: AbortSignal }) => Promise<RespostaDoModelo>

/** O Claude de verdade, ou null sem ANTHROPIC_API_KEY (aí a Capi responde como indisponível). */
export function modeloClaude(env: Env): ModeloCapi | null {
  if (!env.ANTHROPIC_API_KEY) return null
  // Uma nova tentativa no máximo: o prazo total da Capi (15 s) vale para o loop inteiro.
  const cliente = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1 })
  return (parametros, { signal }) => cliente.beta.messages.create(parametros, { signal })
}
