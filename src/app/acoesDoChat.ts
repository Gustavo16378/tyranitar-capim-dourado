// O que cada ação da resposta da Capi vira na conversa (docs/api.md › POST /api/chat).
import type { IconName } from '../componentes/icones'
import type { AcaoChat } from '../tipos'

export interface BotaoDaAcao {
  chave: string
  rotulo: string
  destino: string
  icone?: IconName
  /** Só um botão principal por tela: a reserva criada, ou então o de reservar. */
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
      const destino = `/produto/${encodeURIComponent(acao.produtoId)}`
      botoes.push({ chave: `reservar-${acao.produtoId}`, rotulo: 'Sim, separar', destino })
    } else {
      const destino = `/mapa?loja=${encodeURIComponent(acao.mapaId)}`
      botoes.push({ chave: `rota-${acao.mapaId}`, rotulo: 'Ver no mapa', destino, icone: 'mapa' })
    }
  }
  // Se a Capi já reservou, o botão de reservar some (é o mesmo produto).
  const criada = botoes.some((b) => b.chave.startsWith('reserva-'))
  const visiveis = botoes.filter((b) => !(criada && b.chave.startsWith('reservar-')))
  const principal =
    visiveis.find((b) => b.chave.startsWith('reserva-')) ?? visiveis.find((b) => b.chave.startsWith('reservar-'))
  return { botoes: visiveis.map((b) => ({ ...b, principal: b === principal })), abrirSozinho }
}
