// Trava do servidor para a ferramenta reservar: o modelo só reserva se a última mensagem do
// cliente for uma confirmação. O prompt já pede para confirmar antes; isto garante.
import { normalizar } from '../texto'

const SIM = /\b(sim|pode|podes|confirmo|confirmado|confirma|quero|reserva|reservar|reserve|separa|separar|separe|fechado|fechou|isso|ok|okay|beleza|bora|claro|manda|faz|fazer|pix|na loja)\b/
const NAO = /\b(nao|nem|depois|espera|calma|outro|outra|outros|outras|mais opcoes|mais barato|cancela)\b/

/** Se o texto do cliente confirma a reserva ("Pode separar, pago na loja"). */
export function clienteConfirmou(texto: string): boolean {
  const t = normalizar(texto)
  return SIM.test(t) && !NAO.test(t)
}
