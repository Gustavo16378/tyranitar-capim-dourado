// Banco de mentira do painel da loja: o lojista da "Loja de esportes", a Ana do seed, as
// reservas, o catálogo e os cupons da loja. Fica na memória: recarregar a página volta tudo
// ao início, o que deixa a demonstração repetível. Os testes chamam reiniciarMocks().
import { QR_DA_ANA } from '../../loja/telas/atendimento/demo'
import type { NivelApi, ProdutoDaLoja, ReservaDaLoja, TipoCupom, UsuarioLogado } from '../../tipos/loja'

export const LOJA = {
  id: 'loja-esportes',
  nome: 'Loja de esportes',
  /** Categorias que a loja vende: filtram a ficha do cliente (RN04). */
  categorias: ['calcados', 'roupas', 'acessorios'],
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

export interface ReservaMock extends ReservaDaLoja {
  clienteId: string
}

export interface UsoDeCupom {
  cupomId: string
  clienteId: string
  compraId: string
  centavos: number
}

export const ORDEM_DOS_NIVEIS: readonly NivelApi[] = ['SEMENTE', 'BROTO', 'CAPIM', 'DOURADO']

export function nivelAtende(nivel: NivelApi, minimo: NivelApi) {
  return ORDEM_DOS_NIVEIS.indexOf(nivel) >= ORDEM_DOS_NIVEIS.indexOf(minimo)
}

const HORA = 60 * 60 * 1000

/** Hoje em Palmas (UTC-3), no formato das validades: "2026-11-13". */
export function hojeEmPalmas(agora = new Date()) {
  return new Date(agora.getTime() - 3 * HORA).toISOString().slice(0, 10)
}

/** A data daqui a tantos dias (negativo: no passado), para as validades não vencerem com o tempo. */
function emDias(dias: number) {
  return hojeEmPalmas(new Date(Date.now() + dias * 24 * HORA))
}

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

  const cupom = (c: Partial<CupomMock> & Pick<CupomMock, 'id' | 'titulo' | 'origem' | 'tipo' | 'valor'>): CupomMock => ({
    categoriaAlvo: null,
    nivelMinimo: 'SEMENTE',
    limitePorCliente: 1,
    validade: emDias(48),
    ativo: true,
    ...c,
  })
  const cupons: CupomMock[] = [
    cupom({ id: 'cp1', titulo: '10% em calçados', origem: 'LOJA', tipo: 'PERCENTUAL', valor: 10, categoriaAlvo: 'calcados' }),
    cupom({ id: 'cp2', titulo: 'R$ 20 do shopping', origem: 'SHOPPING', tipo: 'VALOR', valor: 2000, validade: emDias(32) }),
    // Segundo cupom da loja: não combina com o cp1 na mesma compra (RN05).
    cupom({ id: 'cp3', titulo: 'R$ 15 em camisetas', origem: 'LOJA', tipo: 'VALOR', valor: 1500, categoriaAlvo: 'roupas' }),
    // Cupons da loja que a Ana não vê no atendimento: vencido e só para o nível Dourado.
    cupom({ id: 'cp4', titulo: 'Squeeze de brinde', origem: 'LOJA', tipo: 'BRINDE', valor: 0, validade: emDias(-13) }),
    cupom({ id: 'cp5', titulo: '15% para clientes Dourado', origem: 'LOJA', tipo: 'PERCENTUAL', valor: 15, nivelMinimo: 'DOURADO', limitePorCliente: 2 }),
  ]

  // Usos de outros clientes antes de hoje, para a tela de Cupons ter o que mostrar.
  const usos: UsoDeCupom[] = [
    ...Array.from({ length: 12 }, (_, i) => ({ cupomId: 'cp1', clienteId: `cliente-antigo-${i}`, compraId: `co-antiga-${i}`, centavos: 2990 + i * 410 })),
    ...Array.from({ length: 5 }, (_, i) => ({ cupomId: 'cp3', clienteId: `cliente-antigo-${i}`, compraId: `co-antiga-c${i}`, centavos: 1500 })),
    ...Array.from({ length: 9 }, (_, i) => ({ cupomId: 'cp4', clienteId: `cliente-antigo-${i}`, compraId: `co-antiga-b${i}`, centavos: 0 })),
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

  return {
    clientes: [ana, bruno],
    cupons,
    reservas,
    produtos,
    usos,
    compras: 0,
    proximoId: 100,
  }
}

export let banco = estadoInicial()

/** Volta os dados ao início (testes e "recomeçar a demonstração"). */
export function reiniciarMocks() {
  banco = estadoInicial()
}

/** Id novo para o que o mock cria: novoId('p') → 'p100'. */
export function novoId(prefixo: string) {
  banco.proximoId += 1
  return `${prefixo}${banco.proximoId}`
}
