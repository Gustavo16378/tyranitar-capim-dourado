// Tipos que valem para toda a API (docs/api.md), usados pelos dois painéis: erro, lista
// paginada, login, nível, período e o formato de um cupom com o uso dele.

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

/** Período dos relatórios: ?periodo=30d. */
export type Periodo = '7d' | '30d' | '90d'

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

// ---------- cupons: da loja (/api/loja/cupons) e vouchers do shopping (/api/shopping/cupons) ----------

export type TipoCupom = 'PERCENTUAL' | 'VALOR' | 'BRINDE'

export interface CupomComUso {
  id: string
  titulo: string
  tipo: TipoCupom
  /** PERCENTUAL: 1 a 100. VALOR: centavos. BRINDE: 0. */
  valor: number
  /** Se preenchido, o cupom só aparece para quem tem interesse nessa categoria. */
  categoriaAlvo: string | null
  nivelMinimo: NivelApi
  limitePorCliente: number
  /** Último dia de uso, em Palmas: "2026-12-31". */
  validade: string
  ativo: boolean
  /** Quantas compras usaram o cupom. */
  usos: number
  /** Soma dos descontos dados com ele. */
  descontoCentavos: number
}

/** Corpo de POST /api/loja/cupons e de POST /api/shopping/cupons. */
export type PedidoCupom = Pick<
  CupomComUso,
  'titulo' | 'tipo' | 'valor' | 'categoriaAlvo' | 'nivelMinimo' | 'limitePorCliente' | 'validade'
>
