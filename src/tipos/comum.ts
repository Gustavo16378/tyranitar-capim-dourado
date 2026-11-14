// Formatos gerais do contrato da API (docs/api.md › Convenções).

/** Corpo de toda resposta de erro da API. */
export interface RespostaErro {
  status: number
  erro: string
  mensagem: string
  /** Só no 409 RESERVA_REPETIDA de POST /api/reservas: a reserva que o cliente já tem. */
  reserva?: { id: string; link: string }
}

/** Listas paginadas: ?pagina=1&tamanho=20 → { itens, total }. */
export interface Lista<T> {
  itens: T[]
  total: number
}

/** Nível de fidelidade como a API devolve (em maiúsculas). Os componentes usam minúsculas. */
export type NivelApi = 'SEMENTE' | 'BROTO' | 'CAPIM' | 'DOURADO'

/** 1: térreo (lojas). 2: segundo piso (praça de alimentação). */
export type Piso = 1 | 2

/** Período dos relatórios dos painéis: ?periodo=30d. */
export type Periodo = '7d' | '30d' | '90d'
