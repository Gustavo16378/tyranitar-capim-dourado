// Mock de POST /api/reservas, GET /api/reservas/{id} e POST /api/reservas/{id}/pagamento, com as
// regras da API: estoque desconta na reserva e volta quando ela expira (RN03), pagar na loja vale
// 4 h (RN01), pago por Pix vale 48 h (RN02) e o prazo é conferido sempre que a reserva é lida.
// O produto vem do catálogo da fonte atual (src/api/produtos): com produtos já na API real, a
// reserva continua funcionando aqui até a rota de reservas existir.
// As reservas ficam guardadas no aparelho, para o link de uma reserva abrir depois de recarregar.
import type { NovaReserva, ProdutoResumo, Reserva, ReservaDetalhe } from '../../tipos'
import { obterProduto } from '../produtos'
import { falhar, responder } from './atraso'
import { acharProduto } from './produtos'

const HORA = 60 * 60 * 1000
export const PRAZO_NA_LOJA = 4 * HORA
export const PRAZO_PIX_PAGO = 48 * HORA

const CHAVE = 'mock-reservas'
const EM_ABERTO = new Set(['PENDENTE', 'CONFIRMADA', 'SEPARADA'])

/** No mock, o produto nunca sai do catálogo. */
interface ReservaGuardada extends Reserva {
  produto: ProdutoResumo
  quantidade: number
}

function lerDoAparelho(): ReservaGuardada[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? '[]') as ReservaGuardada[]
  } catch {
    return []
  }
}

/** As reservas do mock. O estoque do catálogo do mock volta ao normal quando a página recarrega. */
const RESERVAS: ReservaGuardada[] = lerDoAparelho()

function guardar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(RESERVAS))
  } catch {
    // Sem armazenamento: as reservas valem só até recarregar.
  }
}

function pixSimulado(id: string, centavos: number) {
  const valor = (centavos / 100).toFixed(2)
  return `00020126360014BR.GOV.BCB.PIX0114SIMULADO-${id}520400005303986540${valor.length}${valor}5802BR5913CAPIM DOURADO6006PALMAS6304SIMU`
}

/** Prazo vencido vira EXPIRADA e o estoque volta (RN01, RN02, RN03). */
function conferirPrazo(reserva: ReservaGuardada, agora: number) {
  if (!EM_ABERTO.has(reserva.status) || Date.parse(reserva.expiraEm) > agora) return
  reserva.status = 'EXPIRADA'
  const local = acharProduto(reserva.produto.id)
  if (local) local.estoque += reserva.quantidade
  guardar()
}

/** A reserva como POST /api/reservas e o pagamento devolvem. */
function comoResposta({ id, status, formaPagamento, pago, precoCentavos, expiraEm, pix }: Reserva): Reserva {
  return { id, status, formaPagamento, pago, precoCentavos, expiraEm, ...(pix ? { pix } : {}) }
}

function resumo({ id, nome, categoria, precoCentavos, estoque, foto, loja }: ProdutoResumo): ProdutoResumo {
  return { id, nome, categoria, precoCentavos, estoque, foto, loja }
}

export async function criarReserva({ produtoId, quantidade, formaPagamento }: NovaReserva, agora = Date.now()) {
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 5) {
    return falhar(400, 'DADOS_INVALIDOS', 'A quantidade vai de 1 a 5.')
  }
  // 404 no formato da API quando o produto não existe.
  const produto = await obterProduto(produtoId)
  if (produto.estoque < quantidade) return falhar(409, 'SEM_ESTOQUE', 'Esse produto acabou de esgotar nesta loja.')

  // O estoque só desconta no catálogo do mock; o do banco quem desconta é a rota de verdade.
  const local = acharProduto(produtoId)
  if (local) local.estoque -= quantidade
  const id = `r-${RESERVAS.length + 1}`
  const precoCentavos = produto.precoCentavos * quantidade
  const reserva: ReservaGuardada = {
    id,
    status: 'PENDENTE',
    formaPagamento,
    pago: false,
    precoCentavos,
    expiraEm: new Date(agora + PRAZO_NA_LOJA).toISOString(),
    ...(formaPagamento === 'PIX' ? { pix: { copiaECola: pixSimulado(id, precoCentavos), simulado: true } } : {}),
    produto: resumo(produto),
    quantidade,
  }
  RESERVAS.push(reserva)
  guardar()
  return responder(comoResposta(reserva))
}

export function obterReserva(id: string, agora = Date.now()): Promise<ReservaDetalhe> {
  const reserva = RESERVAS.find((r) => r.id === id)
  if (!reserva) return falhar(404, 'NAO_ENCONTRADO', 'Não achamos essa reserva.')
  conferirPrazo(reserva, agora)
  return responder({ ...comoResposta(reserva), produto: reserva.produto })
}

/** Pagar o Pix não muda o status: a reserva segue PENDENTE, agora paga. Quem separa é a loja. */
export function pagarReserva(id: string, agora = Date.now()) {
  const reserva = RESERVAS.find((r) => r.id === id)
  if (!reserva) return falhar(404, 'NAO_ENCONTRADO', 'Não achamos essa reserva.')
  conferirPrazo(reserva, agora)
  if (reserva.formaPagamento !== 'PIX' || reserva.pago || !EM_ABERTO.has(reserva.status)) {
    return falhar(409, 'TRANSICAO_INVALIDA', 'Essa reserva não está esperando pagamento.')
  }
  reserva.pago = true
  reserva.expiraEm = new Date(agora + PRAZO_PIX_PAGO).toISOString()
  guardar()
  return responder(comoResposta(reserva))
}

/** As reservas em aberto, para a carteira (já com o prazo conferido). */
export function reservasEmAberto(agora = Date.now()) {
  RESERVAS.forEach((r) => conferirPrazo(r, agora))
  return RESERVAS.filter((r) => EM_ABERTO.has(r.status))
    .sort((a, b) => Date.parse(a.expiraEm) - Date.parse(b.expiraEm))
    .map(({ id, produto, status, pago, expiraEm }) => ({
      id,
      produto: produto.nome,
      status,
      pago,
      expiraEm,
      loja: { nome: produto.loja.nome, piso: produto.loja.piso, mapaId: produto.loja.mapaId },
    }))
}
