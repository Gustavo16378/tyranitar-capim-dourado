// Tipos das rotas que o painel da loja usa, no formato de docs/api.md.
// O front (src/loja/api) e os mocks (src/mocks/loja) leem daqui; quando as Functions
// existirem, elas podem importar os mesmos tipos.

// ---------- comuns ----------

/** Corpo de todo erro da API: { status, erro, mensagem }. */
export interface CorpoErro {
  status: number
  /** Código estável para o front decidir o que fazer: SEM_ESTOQUE, CUPOM_INVALIDO... */
  erro: string
  /** Frase pronta para mostrar ao usuário. */
  mensagem: string
}

/** Listas paginadas: ?pagina=1&tamanho=20. */
export interface Pagina<T> {
  itens: T[]
  total: number
}

export type Perfil = 'CLIENTE' | 'LOJISTA' | 'ADMIN_SHOPPING'

/** Níveis de fidelidade como a API escreve. Os componentes usam minúsculas: paraNivel(). */
export type NivelApi = 'SEMENTE' | 'BROTO' | 'CAPIM' | 'DOURADO'

export type StatusReserva = 'PENDENTE' | 'CONFIRMADA' | 'SEPARADA' | 'RETIRADA' | 'CANCELADA' | 'EXPIRADA'

export type FormaPagamento = 'PIX' | 'NA_LOJA'

// ---------- POST /api/auth/login ----------

export interface PedidoLogin {
  email: string
  senha: string
}

export interface UsuarioLogado {
  id: string
  nome: string
  perfil: Perfil
  /** Só lojista tem loja. */
  lojaId: string | null
}

export interface RespostaLogin {
  token: string
  usuario: UsuarioLogado
}

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

// ---------- GET /api/loja/reservas e PATCH /api/loja/reservas/{id} ----------
// O contrato fixa a paginação e as transições; os campos de cada item abaixo são a
// proposta do painel. Se a API devolver outro formato, ajuste aqui e no mock.

export interface ReservaDaLoja {
  id: string
  produto: string
  /** Só o primeiro nome, como no atendimento. */
  cliente: string
  quantidade: number
  status: StatusReserva
  formaPagamento: FormaPagamento
  pago: boolean
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
