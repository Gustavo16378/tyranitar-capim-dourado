// Banco de mentira das telas do painel da loja que a API ainda não tem: Cupons e Desempenho
// (/api/loja/cupons e /relatorios). Os produtos ficam aqui porque o relatório de mentira usa.
// Fica na memória: recarregar a página volta tudo ao início. Os testes chamam reiniciarMocks().
import type { NivelApi, ProdutoDaLoja, ReservaDaLoja, TipoCupom } from '../../tipos/loja'
import { hojeEmPalmas } from '../../painel/comum/formatos'

export const LOJA = {
  id: 'loja-esportes',
  nome: 'Loja de esportes',
  /** Categorias iniciais da loja; as atuais ficam em banco.categorias. */
  categorias: ['calcados', 'roupas', 'acessorios'],
}

/** Um cupom como o banco guarda (tabela cupom). Sem loja, é voucher do shopping. */
export interface CupomMock {
  id: string
  titulo: string
  /** LOJA: desta loja. SHOPPING: voucher do shopping, vale em qualquer loja. */
  origem: 'LOJA' | 'SHOPPING'
  tipo: TipoCupom
  /** PERCENTUAL: 1 a 100. VALOR: centavos. BRINDE: 0. */
  valor: number
  categoriaAlvo: string | null
  nivelMinimo: NivelApi
  limitePorCliente: number
  /** Último dia de uso: "2026-12-31". */
  validade: string
  ativo: boolean
}

const DIA = 24 * 60 * 60 * 1000
const HORA = 60 * 60 * 1000

/** A data daqui a tantos dias (negativo: no passado), para as validades não vencerem com o tempo. */
export function emDias(dias: number) {
  return hojeEmPalmas(Date.now() + dias * DIA)
}

/** Data de tantos dias atrás, às `hora` de Palmas (UTC-3). */
function diasAtras(dias: number, hora = 15) {
  const data = new Date(Date.now() - dias * DIA)
  data.setUTCHours(hora + 3, (dias * 7) % 60, 0, 0)
  return data.toISOString()
}

/** Cupom com os valores que quase todo cupom tem; passe só o que muda. */
function cupomMock(c: Partial<CupomMock> & Pick<CupomMock, 'id' | 'titulo' | 'origem' | 'tipo' | 'valor'>): CupomMock {
  return { categoriaAlvo: null, nivelMinimo: 'SEMENTE', limitePorCliente: 1, validade: emDias(48), ativo: true, ...c }
}

export interface ReservaMock extends ReservaDaLoja {
  clienteId: string
}

/** Uma compra registrada pela plataforma, para o Desempenho e o uso dos cupons. */
export interface CompraMock {
  id: string
  clienteId: string
  cliente: string
  criadoEm: string
  brutoCentavos: number
  descontoLojaCentavos: number
  descontoShoppingCentavos: number
  pagoCentavos: number
  retirada: boolean
}

export interface UsoDeCupom {
  cupomId: string
  clienteId: string
  compraId: string
  centavos: number
}

function emHoras(horas: number) {
  return new Date(Date.now() + horas * HORA).toISOString()
}

function estadoInicial() {
  const cupons: CupomMock[] = [
    cupomMock({ id: 'cp1', titulo: '10% em calçados', origem: 'LOJA', tipo: 'PERCENTUAL', valor: 10, categoriaAlvo: 'calcados' }),
    // Segundo cupom da loja: não combina com o cp1 na mesma compra (RN05).
    cupomMock({ id: 'cp3', titulo: 'R$ 15 em camisetas', origem: 'LOJA', tipo: 'VALOR', valor: 1500, categoriaAlvo: 'roupas' }),
    // Cupons da loja que a Ana não vê no atendimento: vencido e só para o nível Dourado.
    cupomMock({ id: 'cp4', titulo: 'Squeeze de brinde', origem: 'LOJA', tipo: 'BRINDE', valor: 0, validade: emDias(-13) }),
    cupomMock({ id: 'cp5', titulo: '15% para clientes Dourado', origem: 'LOJA', tipo: 'PERCENTUAL', valor: 15, nivelMinimo: 'DOURADO', limitePorCliente: 2 }),
  ]

  const { compras, usos } = historicoDeCompras()

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
    reserva('r1', 'cliente-ana', 'Ana', 'Tênis de corrida Pulse', 39990, 'SEPARADA', 'PIX', 30),
    reserva('r2', 'cliente-bruno', 'Bruno', 'Camiseta dry-fit Trilha', 8990, 'PENDENTE', 'NA_LOJA', 3),
    reserva('r3', 'cliente-carla', 'Carla', 'Meia de compressão', 5990, 'CONFIRMADA', 'NA_LOJA', 2),
    reserva('r4', 'cliente-diego', 'Diego', 'Tênis Run 2 preto', 34990, 'SEPARADA', 'PIX', 40),
    reserva('r5', 'cliente-elaine', 'Elaine', 'Garrafa térmica 1 L', 12990, 'PENDENTE', 'NA_LOJA', 0.6),
    reserva('r6', 'cliente-fabio', 'Fábio', 'Bermuda de corrida', 9990, 'CONFIRMADA', 'NA_LOJA', 1),
    reserva('r7', 'cliente-gabi', 'Gabi', 'Boné esportivo', 7990, 'SEPARADA', 'NA_LOJA', 2.5),
    reserva('r8', 'cliente-henrique', 'Henrique', 'Mochila de hidratação', 21990, 'RETIRADA', 'NA_LOJA', -2),
    reserva('r9', 'cliente-iara', 'Iara', 'Jaqueta corta-vento', 18990, 'CANCELADA', 'NA_LOJA', -5),
    reserva('r10', 'cliente-joao', 'João', 'Camiseta dry-fit Trilha', 8990, 'EXPIRADA', 'NA_LOJA', -20),
  ]

  const produto = (
    id: string,
    nome: string,
    categoria: string,
    precoCentavos: number,
    estoque: number,
    atributos: Record<string, unknown>,
    ativo = true,
  ): ProdutoDaLoja => ({ id, nome, descricao: '', categoria, precoCentavos, estoque, fotos: [], atributos, ativo })
  const produtos: ProdutoDaLoja[] = [
    produto('p1', 'Tênis de corrida Pulse', 'calcados', 39990, 2, { numeracao: [38, 39, 40, 41, 42, 43], cor: 'preto' }),
    produto('p2', 'Tênis Run 2 preto', 'calcados', 34990, 5, { numeracao: [39, 40, 41, 42], cor: 'preto' }),
    produto('p3', 'Camiseta dry-fit Trilha', 'roupas', 8990, 12, { tamanhos: ['P', 'M', 'G', 'GG'], cor: 'verde' }),
    produto('p4', 'Meia de compressão', 'roupas', 5990, 20, { tamanhos: ['P', 'M', 'G'], cor: 'preta' }),
    produto('p5', 'Bermuda de corrida', 'roupas', 9990, 6, { tamanhos: ['M', 'G'], cor: 'cinza' }),
    produto('p6', 'Boné esportivo', 'acessorios', 7990, 0, { cor: 'branco', material: 'poliéster' }),
    produto('p7', 'Garrafa térmica 1 L', 'acessorios', 12990, 4, { cor: 'azul', material: 'inox' }),
    produto('p8', 'Mochila de hidratação', 'acessorios', 21990, 1, { cor: 'preta', material: 'nylon' }),
    produto('p9', 'Jaqueta corta-vento', 'roupas', 18990, 3, { tamanhos: ['P', 'M', 'G'], cor: 'verde' }, false),
  ]
  for (const p of produtos) p.descricao = `${p.nome} da ${LOJA.nome}.`
  // As fotos da demonstração em public/produtos (as mesmas do seed), nos produtos que batem.
  produtos[0].fotos = ['/produtos/tenis-de-corrida.webp']
  produtos[8].fotos = ['/produtos/jaqueta-corta-vento.webp']

  return {
    /** Categorias que a loja vende agora: crescem quando ela cadastra produto de outra. */
    categorias: [...LOJA.categorias],
    cupons,
    reservas,
    produtos,
    usos,
    compras,
    proximoId: 100,
  }
}

const NOMES = ['Rafael', 'Juliana', 'Pedro', 'Marina', 'Lucas', 'Camila', 'Thiago', 'Beatriz', 'Felipe', 'Larissa', 'Hugo', 'Aline']

/** Compras com voucher do shopping, há tantos dias (R$ 20 cada). */
const COMPRAS_COM_VOUCHER = [74, 61, 48, 35, 27, 19, 9, 4]

/**
 * As compras pela plataforma nos últimos 90 dias, para o Desempenho, e os usos de cupom que
 * saem delas, para a tela de Cupons: as duas telas contam a mesma história.
 */
function historicoDeCompras() {
  const compras: CompraMock[] = []
  const usos: UsoDeCupom[] = []
  const registrar = (
    id: string,
    bruto: number,
    cupom?: { cupomId: string; centavos: number; doShopping?: boolean },
    dias = 1 + ((compras.length * 37) % 88),
  ) => {
    const i = compras.length
    const clienteId = `cliente-antigo-${i}`
    const descontoLoja = cupom && !cupom.doShopping ? cupom.centavos : 0
    const descontoShopping = cupom?.doShopping ? cupom.centavos : 0
    compras.push({
      id,
      clienteId,
      cliente: NOMES[i % NOMES.length],
      criadoEm: diasAtras(dias, 10 + ((i * 5) % 11)),
      brutoCentavos: bruto,
      descontoLojaCentavos: descontoLoja,
      descontoShoppingCentavos: descontoShopping,
      pagoCentavos: bruto - descontoLoja - descontoShopping,
      retirada: i % 7 === 3,
    })
    if (cupom) usos.push({ cupomId: cupom.cupomId, clienteId, compraId: id, centavos: cupom.centavos })
  }

  for (let i = 0; i < 12; i++) registrar(`co-h${i + 1}`, 29900 + 4100 * i, { cupomId: 'cp1', centavos: 2990 + 410 * i })
  for (let i = 0; i < 5; i++) registrar(`co-c${i + 1}`, 17980 + 1000 * i, { cupomId: 'cp3', centavos: 1500 })
  for (let i = 0; i < 9; i++) registrar(`co-b${i + 1}`, 12990 + 500 * i, { cupomId: 'cp4', centavos: 0 })
  for (const [i, dias] of COMPRAS_COM_VOUCHER.entries()) {
    registrar(`co-v${i + 1}`, 8990 + 2500 * i, { cupomId: 'cp2', centavos: 2000, doShopping: true }, dias)
  }
  for (let i = 0; i < 16; i++) registrar(`co-s${i + 1}`, 5990 + 2700 * i)

  return { compras, usos }
}

export let banco = estadoInicial()

/** Volta os dados ao início (os testes chamam antes de cada um). */
export function reiniciarMocks() {
  banco = estadoInicial()
}

/** As compras que usaram o cupom. */
export function usosDoCupom(cupom: CupomMock) {
  return banco.usos.filter((u) => u.cupomId === cupom.id)
}

/** Id novo para o que o mock cria: novoId('p') → 'p100'. */
export function novoId(prefixo: string) {
  banco.proximoId += 1
  return `${prefixo}${banco.proximoId}`
}
