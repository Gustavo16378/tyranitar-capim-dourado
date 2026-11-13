import type { MensagemChat, RespostaChat } from '../tipos'
import { requisitar } from './cliente'
import { usarMock } from './fonte'
import * as mock from './mocks/chat'

/** POST /api/chat. Se a IA cair, a API responde 503 IA_INDISPONIVEL e a tela faz a busca comum. */
export function enviarMensagem(mensagem: MensagemChat) {
  if (usarMock('chat')) return mock.enviarMensagem(mensagem)
  return requisitar<RespostaChat>('POST', '/api/chat', mensagem)
}

/** A primeira mensagem do roteiro da demonstração (o texto e o print do tênis). */
export const PERGUNTA_DEMO = mock.PERGUNTA_DEMO
