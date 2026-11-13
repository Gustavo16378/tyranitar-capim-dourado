// Os reembolsos dos vouchers do shopping (RF31, RN11): agrupados por loja, a que mais tem a
// receber primeiro, e o pagamento de um por um. O extrato da loja lê os mesmos.
import { ErroApi } from '../erros'
import { nomeDaUnidade } from '../repo/lojas'
import { buscarReembolso, listarReembolsos, marcarReembolsoPago, type ReembolsoLinha } from '../repo/reembolsos'
import { deSqlite, paraSqlite } from '../regras/datas'

export type StatusReembolso = ReembolsoLinha['status']

/** ?status= da URL: PENDENTE, PAGO ou nada (todos). */
export function lerStatusReembolso(url: URL): StatusReembolso | undefined {
  const status = url.searchParams.get('status')?.trim()
  if (!status) return undefined
  if (status !== 'PENDENTE' && status !== 'PAGO') throw new ErroApi('DADOS_INVALIDOS', 'Use status PENDENTE ou PAGO.')
  return status
}

export function reembolsoParaApi(r: ReembolsoLinha) {
  return {
    id: r.id,
    compraId: r.compra_id,
    cupom: { id: r.cupom_id, titulo: r.cupom_titulo },
    centavos: r.valor_centavos,
    status: r.status,
    criadoEm: deSqlite(r.criado_em).toISOString(),
    pagoEm: r.pago_em ? deSqlite(r.pago_em).toISOString() : null,
  }
}

const soma = (lista: ReembolsoLinha[]) => lista.reduce((total, r) => total + r.valor_centavos, 0)

/**
 * GET /api/shopping/reembolsos. Os totais e o pendente/pago de cada loja contam todos os
 * reembolsos; o filtro de status vale só para os itens (e para quais lojas aparecem).
 */
export async function montarReembolsos(db: D1Database, status: StatusReembolso | undefined, agora = new Date()) {
  const todos = await listarReembolsos(db)
  const pendentes = todos.filter((r) => r.status === 'PENDENTE')
  const ha30Dias = agora.getTime() - 30 * 24 * 60 * 60 * 1000

  const porLoja = new Map<string, ReembolsoLinha[]>()
  for (const r of todos) porLoja.set(r.loja_id, [...(porLoja.get(r.loja_id) ?? []), r])

  const lojas = [...porLoja.values()]
    .map((daLoja) => {
      const { loja_id, loja_nome, loja_numero, loja_ativa } = daLoja[0]
      return {
        loja: { id: loja_id, nome: loja_ativa ? loja_nome : 'Vaga', unidade: nomeDaUnidade(loja_numero) },
        pendenteCentavos: soma(daLoja.filter((r) => r.status === 'PENDENTE')),
        pagoCentavos: soma(daLoja.filter((r) => r.status === 'PAGO')),
        itens: daLoja.filter((r) => !status || r.status === status).map(reembolsoParaApi),
      }
    })
    .filter((l) => l.itens.length > 0)
    .sort((a, b) => b.pendenteCentavos - a.pendenteCentavos || a.loja.nome.localeCompare(b.loja.nome, 'pt-BR'))

  return {
    totais: {
      pendenteCentavos: soma(pendentes),
      lojasComPendencia: new Set(pendentes.map((r) => r.loja_id)).size,
      pagoUltimos30DiasCentavos: soma(
        todos.filter((r) => r.status === 'PAGO' && r.pago_em && deSqlite(r.pago_em).getTime() >= ha30Dias),
      ),
    },
    lojas,
  }
}

/** PATCH /api/shopping/reembolsos/{id}: { status: 'PAGO' }. Pago não volta para pendente. */
export async function pagarReembolso(db: D1Database, id: string, corpo: Record<string, unknown>, agora = new Date()) {
  if (corpo.status !== 'PAGO') throw new ErroApi('DADOS_INVALIDOS', 'O único status que dá para pedir é PAGO.')
  const reembolso = await buscarReembolso(db, id)
  if (!reembolso) throw new ErroApi('NAO_ENCONTRADO', 'Esse reembolso não existe.')
  if (!(await marcarReembolsoPago(db, id, paraSqlite(agora)))) {
    throw new ErroApi('TRANSICAO_INVALIDA', 'Esse reembolso já foi pago.')
  }
  return reembolsoParaApi((await buscarReembolso(db, id))!)
}
