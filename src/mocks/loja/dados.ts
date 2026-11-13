// Banco de mentira do painel da loja: o lojista da "Loja de esportes", a Ana do seed e
// as reservas da loja. Fica na memória: recarregar a página volta tudo ao início, o que
// deixa a demonstração repetível. Os testes chamam reiniciarMocks() antes de cada caso.
import { QR_DA_ANA } from '../../loja/telas/atendimento/demo'
import type { NivelApi, ReservaDaLoja, UsuarioLogado } from '../../tipos/loja'

export const LOJA = {
  id: 'loja-esportes',
  nome: 'Loja de esportes',
  /** Categorias que a loja vende: filtram a ficha do cliente (RN04). */
  categorias: ['calcados', 'roupas'],
}

/** Aceita qualquer e-mail lojista.*@demo.test, como os lojistas do seed. */
export const EMAIL_DO_LOJISTA = /^lojista\.[a-z0-9-]+@demo\.test$/

export const LOJISTA: UsuarioLogado = {
  id: 'usuario-lojista-esportes',
  nome: `Equipe da ${LOJA.nome}`,
  perfil: 'LOJISTA',
  lojaId: LOJA.id,
}

export interface ClienteMock {
  id: string
  /** Só o primeiro nome vai para a loja. */
  nome: string
  nivel: NivelApi
  qrToken: string
  pontos: number
  consentimentoFicha: boolean
  interesses: { categoria: string; detalhe: string }[]
}

export interface CupomMock {
  id: string
  titulo: string
  origem: 'LOJA' | 'SHOPPING'
  tipo: 'PERCENTUAL' | 'VALOR'
  /** PERCENTUAL: 1 a 100. VALOR: centavos. */
  valor: number
  limitePorCliente: number
}

export interface ReservaMock extends ReservaDaLoja {
  clienteId: string
}

export interface UsoDeCupom {
  cupomId: string
  clienteId: string
  compraId: string
}

const HORA = 60 * 60 * 1000

function emHoras(horas: number) {
  return new Date(Date.now() + horas * HORA).toISOString()
}

function estadoInicial() {
  const ana: ClienteMock = {
    id: 'cliente-ana',
    nome: 'Ana',
    nivel: 'CAPIM',
    qrToken: QR_DA_ANA,
    pontos: 2140,
    consentimentoFicha: true,
    interesses: [
      { categoria: 'calcados', detalhe: 'Tênis de corrida, número 42, até R$ 400' },
      { categoria: 'calcados', detalhe: 'Prefere preto' },
      { categoria: 'roupas', detalhe: 'Camisetas dry-fit' },
      // A loja de esportes não vende perfume: este interesse nunca chega ao painel (RN04).
      { categoria: 'perfumaria', detalhe: 'Perfume amadeirado' },
    ],
  }
  // Cliente sem consentimento: a ficha chega vazia.
  const bruno: ClienteMock = {
    id: 'cliente-bruno',
    nome: 'Bruno',
    nivel: 'SEMENTE',
    qrToken: 'q-demo-bruno',
    pontos: 120,
    consentimentoFicha: false,
    interesses: [{ categoria: 'roupas', detalhe: 'Bermuda de corrida' }],
  }

  const cupons: CupomMock[] = [
    { id: 'cp1', titulo: '10% em calçados', origem: 'LOJA', tipo: 'PERCENTUAL', valor: 10, limitePorCliente: 1 },
    { id: 'cp2', titulo: 'R$ 20 do shopping', origem: 'SHOPPING', tipo: 'VALOR', valor: 2000, limitePorCliente: 1 },
  ]

  const reserva = (
    id: string,
    clienteId: string,
    cliente: string,
    produto: string,
    precoCentavos: number,
    status: ReservaMock['status'],
    formaPagamento: ReservaMock['formaPagamento'],
    horasParaExpirar: number,
  ): ReservaMock => ({
    id,
    clienteId,
    cliente,
    produto,
    quantidade: 1,
    precoCentavos,
    status,
    formaPagamento,
    pago: formaPagamento === 'PIX' && status !== 'PENDENTE',
    expiraEm: emHoras(horasParaExpirar),
    criadoEm: emHoras(horasParaExpirar - (formaPagamento === 'PIX' ? 48 : 4)),
  })

  // 7 reservas ativas, 2 pagas com Pix, como no protótipo.
  const reservas: ReservaMock[] = [
    reserva('r1', ana.id, 'Ana', 'Tênis de corrida Pulse', 39990, 'SEPARADA', 'PIX', 30),
    reserva('r2', bruno.id, 'Bruno', 'Camiseta dry-fit Trilha', 8990, 'PENDENTE', 'NA_LOJA', 3),
    reserva('r3', 'cliente-carla', 'Carla', 'Meia de compressão', 5990, 'CONFIRMADA', 'NA_LOJA', 2),
    reserva('r4', 'cliente-diego', 'Diego', 'Tênis Run 2 preto', 34990, 'SEPARADA', 'PIX', 40),
    reserva('r5', 'cliente-elaine', 'Elaine', 'Garrafa térmica 1 L', 12990, 'PENDENTE', 'NA_LOJA', 3.5),
    reserva('r6', 'cliente-fabio', 'Fábio', 'Bermuda de corrida', 9990, 'CONFIRMADA', 'NA_LOJA', 1),
    reserva('r7', 'cliente-gabi', 'Gabi', 'Boné esportivo', 7990, 'SEPARADA', 'NA_LOJA', 2.5),
    reserva('r8', 'cliente-henrique', 'Henrique', 'Mochila de hidratação', 21990, 'RETIRADA', 'NA_LOJA', -2),
    reserva('r9', 'cliente-iara', 'Iara', 'Tênis de trilha', 45990, 'CANCELADA', 'NA_LOJA', -5),
  ]

  return {
    clientes: [ana, bruno],
    cupons,
    reservas,
    usos: [] as UsoDeCupom[],
    compras: 0,
  }
}

export let banco = estadoInicial()

/** Volta os dados ao início (testes e "recomeçar a demonstração"). */
export function reiniciarMocks() {
  banco = estadoInicial()
}
