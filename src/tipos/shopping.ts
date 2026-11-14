// Tipos das rotas do painel do shopping (/api/shopping/*), no formato de docs/api.md.
// O front (src/shopping/api) lê daqui; as Functions (functions/api/shopping) respondem neste formato.
import type { NivelApi, Periodo, Piso } from './comum'
import type { CupomComUso } from './cupom'

export type * from './comum'
export type * from './usuario'
export type { CupomComUso, EdicaoCupom, PedidoCupom, TipoCupom } from './cupom'

// ---------- /api/shopping/lojas e /api/shopping/lojistas (RF27) ----------

export type TipoDeLoja = 'loja' | 'alimentacao'

/** Uma unidade da planta e a loja que funciona nela. Unidade vaga: ativa false, sem nome nem CNPJ. */
export interface LojaDoShopping {
  id: string
  /** Nome da loja; numa vaga, "Vaga". */
  nome: string
  /** O número da unidade na planta: "LOJA 47". */
  unidade: string
  piso: Piso
  /** Área da unidade, em m² (da planta). null quando a planta não traz. */
  areaM2: number | null
  tipo: TipoDeLoja
  /** Categorias que a loja vende: filtram a ficha do cliente (RN04). */
  categorias: string[]
  /** O id da unidade na planta (src/mapa): "loja-47". */
  mapaId: string
  /** 14 dígitos; null numa vaga. */
  cnpj: string | null
  /** false: a unidade está vaga. */
  ativa: boolean
  lojistas: number
}

export interface FiltroLojas {
  /** Texto no nome ou na unidade. */
  q?: string
  situacao?: 'ATIVA' | 'VAGA'
  pagina?: number
  tamanho?: number
}

/** Corpo de PUT /api/shopping/lojas/{id}: ocupar uma vaga, editar uma loja ou liberar a unidade. */
export interface PedidoLoja {
  nome: string
  cnpj: string | null
  tipo: TipoDeLoja
  categorias: string[]
  ativa: boolean
}

/** Corpo de POST /api/shopping/lojas: uma unidade nova na planta. */
export interface PedidoNovaLoja extends PedidoLoja {
  unidade: string
  piso: Piso
  areaM2: number | null
  mapaId: string
}

export interface LojistaDaLoja {
  id: string
  nome: string
  email: string
}

/** Corpo de POST /api/shopping/lojistas. */
export interface PedidoLojista {
  lojaId: string
  nome: string
  email: string
}

/** O lojista criado, com a senha provisória, que só aparece nesta resposta. */
export interface LojistaCriado extends LojistaDaLoja {
  lojaId: string
  senhaProvisoria: string
}

// ---------- /api/shopping/configuracao e /api/shopping/cupons (RF28) ----------

/** As regras da fidelidade (tabela configuracao). */
export interface ConfiguracaoDoShopping {
  /** Pontos dos últimos 12 meses a partir dos quais o cliente está em cada nível (RN08). SEMENTE é 0. */
  niveis: Record<NivelApi, number>
  /** Pontos por real pago (RN07). */
  pontosPorReal: number
  /** Quanto tempo a reserva fica separada (RN01, RN02). */
  prazoReservaHoras: { NA_LOJA: number; PIX: number }
}

/** Voucher do shopping, com o uso: descontoCentavos é o que o shopping devolve às lojas (RN11). */
export type VoucherDoShopping = CupomComUso

// ---------- GET /api/shopping/demanda (RF29) ----------

export interface BuscaContada {
  termo: string
  buscas: number
}

export interface Demanda {
  periodo: Periodo
  /** Buscas feitas no período, com e sem resultado. */
  buscas: number
  /** Buscas sem resultado em nenhuma loja (RN12). */
  semResultado: number
  maisBuscados: BuscaContada[]
  /** As buscas sem resultado, por categoria, da que mais falta para a que menos falta. */
  semResultadoPorCategoria: { categoria: string; buscas: number; termos: BuscaContada[] }[]
}

// ---------- GET /api/shopping/vagas ----------

/** IDEAL: a vaga tem o tamanho típico da categoria. POSSIVEL: um pouco menor ou maior. */
export type Encaixe = 'IDEAL' | 'POSSIVEL'

export interface SugestaoParaVaga {
  categoria: string
  /** Buscas sem resultado da categoria no período. */
  buscas: number
  termos: BuscaContada[]
  encaixe: Encaixe
  /** A frase que explica a sugestão, pronta para mostrar. */
  motivo: string
  /** A categoria já tem outra vaga sugerida (segunda loja do mesmo tipo). */
  repetida: boolean
}

export interface VagaComSugestao {
  id: string
  unidade: string
  piso: Piso
  areaM2: number | null
  mapaId: string
  /** null quando nenhuma categoria com demanda cabe na vaga. */
  sugestao: SugestaoParaVaga | null
  /** Outras categorias que também cabem, da mais procurada para a menos. */
  alternativas: { categoria: string; buscas: number; encaixe: Encaixe }[]
}

/** O cruzamento das buscas sem resultado com as lojas vagas da planta. */
export interface VagasEDemanda {
  periodo: Periodo
  resumo: {
    vagas: number
    areaTotalM2: number
    buscasSemResultado: number
    /** Buscas sem resultado das categorias que ganharam vaga. */
    buscasComVaga: number
  }
  /** Cada categoria com busca sem resultado, e as vagas sugeridas para ela (mapaId). */
  demanda: {
    categoria: string
    buscas: number
    termos: BuscaContada[]
    vagas: string[]
    /** A faixa de área típica da categoria, em m². */
    faixaM2: { min: number; max: number } | null
    /** Por que a categoria ficou sem vaga; null quando ganhou. */
    motivoSemVaga: string | null
  }[]
  /** As vagas, da sugestão mais forte para a mais fraca. */
  vagas: VagaComSugestao[]
}

// ---------- /api/shopping/reembolsos (RF31) ----------

export type StatusReembolso = 'PENDENTE' | 'PAGO'

export interface ReembolsoDoShopping {
  id: string
  compraId: string
  cupom: { id: string; titulo: string }
  centavos: number
  status: StatusReembolso
  /** ISO 8601 (UTC). */
  criadoEm: string
  pagoEm: string | null
}

export interface ReembolsosDaLoja {
  loja: { id: string; nome: string; unidade: string }
  pendenteCentavos: number
  pagoCentavos: number
  itens: ReembolsoDoShopping[]
}

/** Resposta de GET /api/shopping/reembolsos: agrupada por loja, a que mais tem a receber primeiro. */
export interface Reembolsos {
  totais: {
    pendenteCentavos: number
    lojasComPendencia: number
    pagoUltimos30DiasCentavos: number
  }
  lojas: ReembolsosDaLoja[]
}
