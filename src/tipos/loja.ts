// Tipos das rotas que o painel da loja usa, no formato de docs/api.md.
// O front (src/loja/api) lê daqui; as Functions
// (functions/api/loja) respondem neste formato. Os gerais (erro, lista, nível, login,
// cupom) ficam em comum.ts, usuario.ts e cupom.ts e são repetidos aqui, para as telas da
// loja importarem tudo de um lugar.
import type { Lista, NivelApi, Periodo } from './comum'
import type { CupomComUso, TipoCupom } from './cupom'

export type * from './comum'
export type * from './usuario'
export type { CupomComUso, PedidoCupom, TipoCupom } from './cupom'

export type StatusReserva =
  | 'PENDENTE'
  | 'CONFIRMADA'
  | 'SEPARADA'
  | 'RETIRADA'
  | 'CANCELADA'
  | 'RECUSADA'
  | 'EXPIRADA'

export type FormaPagamento = 'PIX' | 'NA_LOJA'

/** Origem de um cupom: LOJA é desta loja; SHOPPING é voucher que vale em qualquer loja (gera reembolso, RN11). */
export type OrigemCupom = 'LOJA' | 'SHOPPING'

// ---------- GET /api/loja/atendimento/{qr} ----------

export interface Atendimento {
  /** Só o primeiro nome do cliente. */
  cliente: { nome: string; nivel: NivelApi }
  /** Interesses em frases curtas, já filtrados pelas categorias da loja (RN04).
   *  Vazia quando o cliente não deu consentimento. */
  ficha: string[]
  /** Reservas do cliente nesta loja que ainda estão em aberto (pendentes, confirmadas e separadas). */
  reservas: ReservaDoCliente[]
  /** Cupons que o cliente pode usar nesta loja agora. */
  cupons: CupomDoCliente[]
}

export interface ReservaDoCliente {
  id: string
  produto: string
  /** A primeira foto do produto; null quando ele não tem. */
  foto: string | null
  /** Categoria do produto (calcados, roupas...): o cupom de categoria do caixa olha para ela. */
  categoria: string
  quantidade: number
  tamanho: string | null
  cor: string | null
  /** Preço × quantidade, sem desconto. */
  brutoCentavos: number
  /** O desconto do cupom escolhido na reserva. */
  descontoCentavos: number
  /** O total da reserva, já com o desconto. */
  precoCentavos: number
  /** O cupom escolhido na reserva: entra sozinho na compra, com o desconto prometido, e ocupa o
   *  lado dele (o cupom da loja ou o voucher do shopping). */
  cupom: { id: string; titulo: string; origem: OrigemCupom } | null
  status: StatusReserva
  /** Paga com Pix: o caixa não cobra de novo. */
  pago: boolean
  /** Confirmada pela loja (CONFIRMADA ou SEPARADA): pode sair no balcão. Pendente, a loja confirma antes. */
  podeRetirar: boolean
}

export interface CupomDoCliente {
  id: string
  titulo: string
  origem: OrigemCupom
  tipo: TipoCupom
  /** Categoria em que o cupom da loja desconta (calcados); null: a compra toda (ou, no voucher, qualquer item). */
  categoria: string | null
  /** O nome da categoria para a tela ("Calçados"); null quando vale para tudo. */
  paraQueVale: string | null
}

// ---------- POST /api/loja/compras e POST /api/loja/compras/previa ----------

/** Um item da compra: uma reserva que sai agora, um produto do catálogo ou um valor avulso ("Outros"). */
export type ItemPedido =
  | { reservaId: string }
  | { produtoId: string; quantidade: number }
  | { valorCentavos: number; descricao: string }

export interface PedidoCompra {
  qrToken: string
  itens: ItemPedido[]
  /** Os cupons escolhidos no caixa: no máximo um da loja e um voucher (RN05). O cupom de uma
   *  reserva entra sozinho e conta nesse limite. */
  cupons: string[]
}

export interface DescontoNaCompra {
  /** Id do cupom. */
  cupom: string
  centavos: number
}

/** Um item como a API calculou: o bruto, o desconto de cada cupom nele e o que sobra. */
export interface ItemDaCompra {
  descricao: string
  /** "tamanho 42, preto" na reserva; null nos outros. */
  detalhe: string | null
  /** null no valor avulso ("Outros"), que não entra em cupom de categoria. */
  categoria: string | null
  produtoId: string | null
  reservaId: string | null
  quantidade: number
  /** Preço de uma unidade. */
  precoCentavos: number
  brutoCentavos: number
  descontos: DescontoNaCompra[]
  pagoCentavos: number
  /** Já pago antes do balcão (reserva com Pix): o caixa não cobra. */
  jaPago: boolean
}

export interface Compra {
  id: string
  itens: ItemDaCompra[]
  valorBrutoCentavos: number
  /** A soma de cada cupom na compra: o da loja primeiro, depois o voucher. */
  descontos: DescontoNaCompra[]
  /** O valor da compra depois dos descontos, contando o que já foi pago com Pix. */
  valorPagoCentavos: number
  /** O que o caixa cobra agora: sem os itens já pagos com Pix. */
  aPagarNoCaixaCentavos: number
  /** 1 ponto por real pago, depois dos descontos (RN07). */
  pontosGerados: number
  /** Voucher do shopping usado: o shopping deve esse valor à loja (RN11). */
  reembolsoGerado: DescontoNaCompra | null
}

/** O mesmo corpo de POST /api/loja/compras; a API calcula e não grava nada. */
export type PedidoPrevia = PedidoCompra

/** A compra como ficaria, sem id: o que o caixa cobra, item por item, e os pontos que o cliente ganha. */
export type PreviaCompra = Omit<Compra, 'id'>

// ---------- GET /api/loja/reservas e PATCH /api/loja/reservas/{id} ----------

export interface ReservaDaLoja {
  id: string
  produto: string
  /** Só o primeiro nome, como no atendimento. */
  cliente: string
  quantidade: number
  tamanho: string | null
  cor: string | null
  status: StatusReserva
  formaPagamento: FormaPagamento
  pago: boolean
  /** Saiu depois de paga por Pix (recusada, cancelada ou expirada): o estorno (simulado) foi pedido. */
  estornoSolicitado?: boolean
  /** Preço × quantidade, sem desconto. */
  brutoCentavos: number
  descontoCentavos: number
  /** O total da reserva, já com o desconto do cupom. */
  precoCentavos: number
  cupom: { id: string; titulo: string; origem: OrigemCupom } | null
  /** A partir de quando fica pronta para retirar (a loja diz ao confirmar). ISO 8601; null antes. */
  prontaEm: string | null
  /** RECUSADA: o motivo que a loja deu (o cliente vê). */
  motivoRecusa: string | null
  /** ISO 8601 (UTC). Pendente: até quando a loja responde; confirmada: até quando o cliente retira. */
  expiraEm: string
  criadoEm: string
}

/** A lista do painel, com quantas esperam a loja confirmar ou recusar (o selo do menu Reservas). */
export interface ListaDeReservas extends Lista<ReservaDaLoja> {
  pendentes: number
}

export interface FiltroReservas {
  /** Um ou mais status, separados por vírgula na URL. */
  status?: StatusReserva[]
  pagina?: number
  tamanho?: number
}

/** Status que a loja pede no PATCH. A retirada é a compra no Atendimento; cancelar é do cliente. */
export type StatusPedidoPelaLoja = 'CONFIRMADA' | 'SEPARADA' | 'RECUSADA'

/** Corpo do PATCH /api/loja/reservas/{id}. */
export type PedidoMudarStatus =
  /** prontaAs: "15:30", no horário de Palmas; sem ela, pronta agora. */
  | { status: 'CONFIRMADA'; prontaAs?: string }
  | { status: 'SEPARADA' }
  /** O motivo é obrigatório e vai no aviso ao cliente. */
  | { status: 'RECUSADA'; motivo: string }

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
  /** O que aconteceu com as reservas feitas no período: quantas viraram retirada.
   *  feitas = retiradas + emAberto + canceladas + recusadas + expiradas. */
  reservas: {
    feitas: number
    retiradas: number
    emAberto: number
    /** Pelo cliente. */
    canceladas: number
    /** Pela loja, com motivo. */
    recusadas: number
    expiradas: number
  }
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
  /** Teve a retirada de uma reserva. */
  retirada: boolean
  /** O que saiu na compra, na ordem do caixa. */
  itens: ItemDoExtrato[]
  reembolso: { status: 'PENDENTE' | 'PAGO'; pagoEm: string | null } | null
}

/** Um item de uma compra do extrato, com o desconto que os cupons deram nele. */
export interface ItemDoExtrato {
  descricao: string
  /** null no valor avulso ("Outros"). */
  categoria: string | null
  quantidade: number
  brutoCentavos: number
  descontoCentavos: number
  /** Pago com Pix antes do balcão. */
  jaPago: boolean
  /** Saiu de uma reserva. */
  retirada: boolean
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
