// O que cada ação da resposta da Capi vira na conversa (docs/api.md › POST /api/chat).
// RESERVAR não vira botão aqui: o cartão do produto tem o "Reservar", que abre a folha de reserva
// (a Capi não reserva). RESERVA_CRIADA só aparece nas conversas de antes dessa mudança.
import type { IconName } from '../componentes/icones'
import type { AcaoChat } from '../tipos'

export interface BotaoDaAcao {
  chave: string
  rotulo: string
  destino: string
  icone?: IconName
  /** Só um botão principal por tela: o da reserva criada (conversas antigas). */
  principal: boolean
}

export interface AcoesNaConversa {
  botoes: BotaoDaAcao[]
  /** Reserva criada com Pix: o app abre o pagamento sozinho. */
  abrirSozinho?: string
}

export function acoesNaConversa(acoes: AcaoChat[]): AcoesNaConversa {
  const botoes: Omit<BotaoDaAcao, 'principal'>[] = []
  let abrirSozinho: string | undefined
  for (const acao of acoes) {
    if (acao.tipo === 'RESERVA_CRIADA') {
      const { id, formaPagamento } = acao.reserva
      const destino = `/reserva/${encodeURIComponent(id)}`
      botoes.push({
        chave: `reserva-${id}`,
        rotulo: formaPagamento === 'PIX' ? 'Pagar com Pix' : 'Ver reserva',
        destino,
      })
      if (formaPagamento === 'PIX') abrirSozinho = destino
    } else if (acao.tipo === 'RESERVAR') {
      // O "Reservar" fica no cartão do produto, que abre a folha de reserva.
      continue
    } else {
      const destino = `/mapa?loja=${encodeURIComponent(acao.mapaId)}`
      botoes.push({ chave: `rota-${acao.mapaId}`, rotulo: 'Ver no mapa', destino, icone: 'mapa' })
    }
  }
  const principal = botoes.find((b) => b.chave.startsWith('reserva-'))
  return { botoes: botoes.map((b) => ({ ...b, principal: b === principal })), abrirSozinho }
}
