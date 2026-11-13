// As regras da fidelidade que o shopping edita (RF28), na tabela configuracao: os pontos de
// cada nível (RN08), os pontos por real (RN07) e os prazos da reserva (RN01, RN02). O caixa e
// a reserva leem as mesmas chaves: a mudança vale a partir da próxima compra e reserva.
import { ErroApi } from '../erros'
import { lerConfiguracao, lerLimitesNivel, lerPrazosReserva } from '../repo/configuracao'
import { ORDEM_NIVEIS, type LimitesNivel } from '../regras/niveis'
import type { PrazosReserva } from '../regras/reserva'

export interface RegrasDaFidelidade {
  niveis: LimitesNivel
  pontosPorReal: number
  prazoReservaHoras: PrazosReserva
}

export async function lerRegrasDaFidelidade(db: D1Database): Promise<RegrasDaFidelidade> {
  const [niveis, prazoReservaHoras, pontos] = await Promise.all([
    lerLimitesNivel(db),
    lerPrazosReserva(db),
    lerConfiguracao(db, 'pontos_por_real'),
  ])
  return { niveis, pontosPorReal: typeof pontos === 'number' && pontos >= 1 ? pontos : 1, prazoReservaHoras }
}

const invalido = (mensagem: string) => new ErroApi('DADOS_INVALIDOS', mensagem)

const inteiroEntre = (valor: unknown, min: number, max: number): valor is number =>
  typeof valor === 'number' && Number.isInteger(valor) && valor >= min && valor <= max

const objeto = (valor: unknown) =>
  valor && typeof valor === 'object' && !Array.isArray(valor) ? (valor as Record<string, unknown>) : null

/** O corpo do PUT, com a regra que falhou na mensagem do 400. */
export function lerPedidoConfiguracao(corpo: Record<string, unknown>): RegrasDaFidelidade {
  const niveis = objeto(corpo.niveis)
  const prazos = objeto(corpo.prazoReservaHoras)
  if (!niveis || !prazos) throw invalido('Envie os níveis, os pontos por real e os prazos.')
  if (niveis.SEMENTE !== 0) throw invalido('O nível Semente começa em 0 ponto.')
  for (const nivel of ORDEM_NIVEIS) {
    if (!inteiroEntre(niveis[nivel], 0, 1_000_000)) throw invalido(`Os pontos do nível ${nivel} precisam ser um número inteiro.`)
  }
  for (let i = 1; i < ORDEM_NIVEIS.length; i++) {
    if ((niveis[ORDEM_NIVEIS[i]] as number) <= (niveis[ORDEM_NIVEIS[i - 1]] as number)) {
      throw invalido('Cada nível precisa de mais pontos que o anterior.')
    }
  }
  if (!inteiroEntre(corpo.pontosPorReal, 1, 10)) throw invalido('Os pontos por real vão de 1 a 10.')
  if (!inteiroEntre(prazos.NA_LOJA, 1, 24)) throw invalido('A reserva para pagar na loja fica separada de 1 a 24 horas.')
  if (!inteiroEntre(prazos.PIX, 1, 168)) throw invalido('A reserva paga com Pix fica separada de 1 a 168 horas.')
  return {
    niveis: Object.fromEntries(ORDEM_NIVEIS.map((n) => [n, niveis[n]])) as LimitesNivel,
    pontosPorReal: corpo.pontosPorReal,
    prazoReservaHoras: { NA_LOJA: prazos.NA_LOJA, PIX: prazos.PIX },
  }
}

export async function gravarRegrasDaFidelidade(db: D1Database, regras: RegrasDaFidelidade) {
  const gravar = (chave: string, valor: unknown) =>
    db
      .prepare('INSERT INTO configuracao (chave, valor) VALUES (?1, ?2) ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor')
      .bind(chave, JSON.stringify(valor))
  await db.batch([
    gravar('niveis', regras.niveis),
    gravar('pontos_por_real', regras.pontosPorReal),
    gravar('prazo_reserva_horas', regras.prazoReservaHoras),
  ])
}
