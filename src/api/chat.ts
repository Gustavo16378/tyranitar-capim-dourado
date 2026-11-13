import type { HistoricoChat, MensagemChat, RespostaChat } from '../tipos'
import { requisitar } from './cliente'
import { usarMock } from './fonte'
import * as mock from './mocks/chat'

/** POST /api/chat. Se a IA cair, a API responde 503 IA_INDISPONIVEL e a tela faz a busca comum. */
export function enviarMensagem(mensagem: MensagemChat, sinal?: AbortSignal) {
  if (usarMock('chat')) return mock.enviarMensagem(mensagem)
  return requisitar<RespostaChat>('POST', '/api/chat', mensagem, sinal)
}

/** GET /api/chat: a conversa salva, para a Capi reabrir de onde parou. */
export function obterConversa() {
  if (usarMock('chat')) return mock.obterConversa()
  return requisitar<HistoricoChat>('GET', '/api/chat')
}

/** DELETE /api/chat: "Nova conversa". */
export function apagarConversa() {
  if (usarMock('chat')) return mock.apagarConversa()
  return requisitar<{ apagadas: number }>('DELETE', '/api/chat')
}

/** A pergunta da sugestão com foto (o texto e o print do tênis da demonstração). */
export const PERGUNTA_DEMO = mock.PERGUNTA_DEMO
