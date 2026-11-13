// Tipos das rotas que o painel da loja usa, no formato de docs/api.md.
// O front (src/loja/api) lê daqui; as Functions
// (functions/api/loja) respondem neste formato. Os gerais (erro, lista, nível, login,
// cupom) ficam em comum.ts, usuario.ts e cupom.ts e são repetidos aqui, para as telas da
// loja importarem tudo de um lugar.
import type { Lista, NivelApi, Periodo } from './comum'
import type { CupomComUso } from './cupom'

export type * from './comum'
export type * from './usuario'
export type { CupomComUso, PedidoCupom, TipoCupom } from './cupom'

export type StatusReserva = 'PENDENTE' | 'CONFIRMADA' | 'SEPARADA' | 'RETIRADA' | 'CANCELADA' | 'EXPIRADA'

export type FormaPagamento = 'PIX' | 'NA_LOJA'

// ---------- GET /api/loja/atendimento/{qr} ----------

export interface Atendimento {
  /** Só o primeiro nome do cliente. */
  cliente: { nome: string; nivel: NivelApi }
  /** Interesses em frases curtas, já filtrados pelas categorias da loja (RN04).
   *  Vazia quando o cliente não deu consentimento. */
  ficha: string[]
  /** Reservas do cliente nesta loja que ainda podem ser retiradas. */
  reservas: ReservaDoCliente[]
  /** Cupons que o cliente pode usar nesta loja agora. */
  cupons: CupomDoCliente[]
}

export interface ReservaDoCliente {
  id: string
  produto: string
  /** A primeira foto do produto; null quando ele não tem. */
  foto: string | null
  status: StatusReserva
  pago: boolean
}

export interface CupomDoCliente {
  id: string
  titulo: string
  /** LOJA: cupom desta loja. SHOPPING: voucher que vale em qualquer loja (gera reembolso, RN11). */
  origem: 'LOJA' | 'SHOPPING'
}

// ---------- POST /api/loja/compras ----------

export interface PedidoCompra {
  qrToken: string
  valorCentavos: number
  /** Ids dos cupons. No máximo um cupom da loja por compra (RN05). */
  cupons: string[]
  /** Para registrar a retirada de uma reserva. Se ela foi paga por Pix, a compra entra com o
   *  valor da reserva e o caixa não cobra de novo. */
  reservaId?: string
}

export interface Compra {
  id: string
  valorBrutoCentavos: number
  descontos: { cupom: string; centavos: number }[]
  valorPagoCentavos: number
  /** 1 ponto por real pago, depois dos descontos (RN07). */
  pontosGerados: number
  /** Voucher do shopping usado: o shopping deve esse valor à loja (RN11). */
  reembolsoGerado: { cupom: string; centavos: number } | null
}

// ---------- POST /api/loja/compras/previa ----------

/** O mesmo corpo de POST /api/loja/compras; a API calcula e não grava nada. */
export type PedidoPrevia = PedidoCompra

/** A compra como ficaria, sem id: o que o caixa cobra e os pontos que o cliente ganha. */
export type PreviaCompra = Omit<Compra, 'id'>

// ---------- GET /api/loja/reservas e PATCH /api/loja/reservas/{id} ----------
// Formato registrado em docs/api.md.

export interface ReservaDaLoja {
  id: string
  produto: string
  /** Só o primeiro nome, como no atendimento. */
  cliente: string
  quantidade: number
  status: StatusReserva
  formaPagamento: FormaPagamento
  pago: boolean
  /** O total da reserva (preço × quantidade no momento da reserva). */
  precoCentavos: number
  /** ISO 8601 (UTC). */
  expiraEm: string
  criadoEm: string
}

export interface FiltroReservas {
  /** Um ou mais status, separados por vírgula na URL. */
  status?: StatusReserva[]
  pagina?: number
  tamanho?: number
}

/** Status que a loja pode pedir no PATCH. EXPIRADA é automática; PENDENTE é só a criação. */
export type StatusPedidoPelaLoja = 'CONFIRMADA' | 'SEPARADA' | 'RETIRADA' | 'CANCELADA'

export interface PedidoMudarStatus {
  status: StatusPedidoPelaLoja
}

// ---------- /api/loja/produtos (RF21, RF22) ----------

export interface ProdutoDaLoja {
  id: string
  nome: string
  descricao: string
  /** calcados, roupas, acessorios... A ficha e a busca usam a categoria. */
  categoria: string
  precoCentavos: number
  /** Nunca negativo; a reserva desconta (RN03). */
  estoque: number
  /** Endereços das fotos; a primeira é a capa. */
  fotos: string[]
  /** Campos que mudam por categoria: { numeracao: [40, 41], cor: 'preto' }. */
  atributos: Record<string, unknown>
  /** Inativo some da busca e da Capi, mas continua no painel. */
  ativo: boolean
}

/** Corpo de POST /api/loja/produtos e de PUT /api/loja/produtos/{id}. */
export type PedidoProduto = Omit<ProdutoDaLoja, 'id'>

export interface FiltroProdutos {
  /** Texto no nome. */
  q?: string
  pagina?: number
  tamanho?: number
}

/** Resposta de POST /api/loja/produtos/importar: as linhas com erro não são salvas. */
export interface ResultadoImportacao {
  importados: number
  /** `linha` conta o cabeçalho como linha 1, como numa planilha. */
  erros: { linha: number; mensagem: string }[]
}

// ---------- /api/loja/cupons (RF23) ----------

/** Cupom da loja com o uso dele; o corpo do POST é o PedidoCupom de cupom.ts. */
export type CupomDaLoja = CupomComUso

// ---------- GET /api/loja/relatorios (RF24) ----------

export interface Relatorio {
  periodo: Periodo
  maisVendidos: { produtoId: string; nome: string; quantidade: number; valorCentavos: number }[]
  maisBuscados: { termo: string; buscas: number }[]
  /** Buscados nas categorias da loja sem resultado em nenhuma loja (RN12). */
  naoEncontrados: { termo: string; buscas: number }[]
  parados: { produtoId: string; nome: string; estoque: number; diasSemVenda: number }[]
  /** diaDaSemana: 0 é domingo. hora: 0 a 23, em Palmas. */
  picos: { diaDaSemana: number; hora: number; compras: number }[]
  cupons: { cupomId: string; titulo: string; usos: number; descontoCentavos: number }[]
  /** null quando não houve compra com (ou sem) ficha no período. */
  ticketMedio: { comFichaCentavos: number | null; semFichaCentavos: number | null }
  /** null com menos de 3 lojas na categoria (RN13). */
  comparativoCategoria: { categoria: string; ticketMedioLojaCentavos: number; ticketMedioCategoriaCentavos: number }[] | null
  /** O que aconteceu com as reservas feitas no período: quantas viraram retirada. */
  reservas: { feitas: number; retiradas: number; emAberto: number; canceladas: number; expiradas: number }
}

// ---------- GET /api/loja/extrato (RF25) ----------

/** Uma compra registrada pela plataforma, com os descontos e o reembolso do voucher. */
export interface LancamentoDoExtrato {
  id: string
  /** ISO 8601 (UTC). */
  criadoEm: string
  /** Só o primeiro nome. */
  cliente: string
  brutoCentavos: number
  /** Cupom da loja: a loja dá o desconto. */
  descontoLojaCentavos: number
  /** Voucher do shopping: o shopping devolve esse valor à loja (RN11). */
  descontoShoppingCentavos: number
  pagoCentavos: number
  /** Retirada de uma reserva. */
  retirada: boolean
  reembolso: { status: 'PENDENTE' | 'PAGO'; pagoEm: string | null } | null
}

export interface Extrato {
  periodo: Periodo
  /** Somas das compras do período. */
  resumo: {
    compras: number
    brutoCentavos: number
    descontoLojaCentavos: number
    descontoShoppingCentavos: number
    pagoCentavos: number
  }
  /** Reembolsos dos vouchers do shopping: o que falta receber (de qualquer data) e o que foi pago no período. */
  reembolsos: { pendenteCentavos: number; pagoNoPeriodoCentavos: number }
  /** As compras do período, da mais nova para a mais antiga, paginadas. */
  lancamentos: Lista<LancamentoDoExtrato>
}
