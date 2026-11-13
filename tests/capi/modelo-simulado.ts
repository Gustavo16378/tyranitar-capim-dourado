// Claude simulado para os testes: devolve respostas gravadas (tests/capi/respostas/*.json), na
// ordem, e guarda o que recebeu em cada chamada. A Capi nunca chama o Claude de verdade nos testes.
import type Anthropic from '@anthropic-ai/sdk'
import type { ModeloCapi, ParametrosDoModelo } from '../../functions/_lib/capi/modelo'

export interface RespostaGravada {
  stop_reason: string
  content: Record<string, unknown>[]
}

export function modeloSimulado(respostas: RespostaGravada[]) {
  const chamadas: ParametrosDoModelo[] = []
  const modelo: ModeloCapi = async (parametros) => {
    // Cópia: o loop continua mexendo no mesmo array de mensagens depois da chamada.
    chamadas.push(structuredClone(parametros))
    const gravada = respostas[chamadas.length - 1]
    if (!gravada) throw new Error(`O modelo simulado não tem a resposta ${chamadas.length}`)
    return {
      id: `msg_simulada_${chamadas.length}`,
      type: 'message',
      role: 'assistant',
      model: parametros.model,
      content: gravada.content,
      stop_reason: gravada.stop_reason,
      stop_sequence: null,
      stop_details: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    } as unknown as Anthropic.Beta.BetaMessage
  }
  return { modelo, chamadas }
}

/** Modelo que só termina quando a Capi aborta (para o teste do prazo). */
export const modeloQueNaoResponde: ModeloCapi = (_parametros, { signal }) =>
  new Promise((_, rejeitar) => signal.addEventListener('abort', () => rejeitar(new Error('abortado'))))

/** Modelo que falha como a API fora do ar. */
export const modeloQueFalha: ModeloCapi = async () => {
  throw new Error('503 overloaded')
}
