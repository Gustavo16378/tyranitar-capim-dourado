// Erros da API, sempre no formato { status, erro, mensagem } (docs/api.md).
// Rotas e regras de negócio lançam ErroApi; o _middleware transforma em resposta.

export type CodigoErro =
  | 'DADOS_INVALIDOS'
  | 'NAO_AUTENTICADO'
  | 'SEM_PERMISSAO'
  | 'NAO_ENCONTRADO'
  | 'EMAIL_EM_USO'
  | 'CNPJ_EM_USO'
  | 'SEM_ESTOQUE'
  | 'NOTA_REPETIDA'
  | 'TRANSICAO_INVALIDA'
  | 'CUPOM_INVALIDO'
  | 'CUPONS_INCOMPATIVEIS'
  | 'LOJA_NAO_CADASTRADA'
  | 'LOJA_VAGA'
  | 'IA_INDISPONIVEL'
  | 'ERRO_INTERNO'

export const STATUS_DO_ERRO: Record<CodigoErro, number> = {
  DADOS_INVALIDOS: 400,
  NAO_AUTENTICADO: 401,
  SEM_PERMISSAO: 403,
  NAO_ENCONTRADO: 404,
  EMAIL_EM_USO: 409,
  CNPJ_EM_USO: 409,
  SEM_ESTOQUE: 409,
  NOTA_REPETIDA: 409,
  TRANSICAO_INVALIDA: 409,
  CUPOM_INVALIDO: 422,
  CUPONS_INCOMPATIVEIS: 422,
  LOJA_NAO_CADASTRADA: 422,
  LOJA_VAGA: 422,
  IA_INDISPONIVEL: 503,
  ERRO_INTERNO: 500,
}

export class ErroApi extends Error {
  readonly codigo: CodigoErro

  /** A mensagem vai para a tela: diga o que aconteceu e o que fazer, sem "Ops!". */
  constructor(codigo: CodigoErro, mensagem: string) {
    super(mensagem)
    this.name = 'ErroApi'
    this.codigo = codigo
  }

  get status() {
    return STATUS_DO_ERRO[this.codigo]
  }
}

export function respostaDeErro(erro: ErroApi) {
  return Response.json({ status: erro.status, erro: erro.codigo, mensagem: erro.message }, { status: erro.status })
}
