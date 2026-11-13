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
  return async (parametros, { signal }) => {
    const resposta = await cliente.beta.messages.create(parametros, { signal })
    // Tokens de cada chamada, para acompanhar o custo (wrangler pages deployment tail). Com o
    // fallback do servidor, o modelo que respondeu pode não ser o pedido: ele vem no log também.
    const uso = resposta.usage
    console.log(
      `Capi: uso ${resposta.model} entrada=${uso.input_tokens} cache_escrita=${uso.cache_creation_input_tokens ?? 0} ` +
        `cache_leitura=${uso.cache_read_input_tokens ?? 0} saida=${uso.output_tokens} parada=${resposta.stop_reason}`,
    )
    return resposta
  }
}
