// POST /api/reservas (CLIENTE): { produtoId, quantidade, formaPagamento, tamanho?, cor?, cupomId? } →
// 201 com a reserva. O estoque baixa na hora, sem vender o que não tem (RN03). A reserva nasce
// PENDENTE: a loja confirma e diz a partir de que horas fica pronta, e o prazo para retirar conta
// daí (RN01, RN02). O cupom escolhido (um dos que valem para o produto, GET /api/produtos/{id}/cupons)
// já desconta no preço e no Pix e fica preso à reserva até a retirada (RN15).
import { cupomDaReserva, lerEscolhas } from '../../_lib/cliente/reservar'
import { exigirPerfil, type Rota } from '../../_lib/contexto'
import { ErroApi } from '../../_lib/erros'
import { json, lerCorpo, texto } from '../../_lib/http'
import { buscarProdutoAtivo } from '../../_lib/repo/produtos'
import { buscarReserva, criarReserva, reservaParaCliente } from '../../_lib/repo/reservas'

export const onRequestPost: Rota = async ({ request, env, data }) => {
  const cliente = exigirPerfil(data, 'CLIENTE')
  const corpo = await lerCorpo(request)
  const produtoId = texto(corpo, 'produtoId', { max: 64 })
  const quantidade = corpo.quantidade ?? 1
  if (typeof quantidade !== 'number' || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > 5) {
    throw new ErroApi('DADOS_INVALIDOS', 'A quantidade vai de 1 a 5.')
  }
  const formaPagamento = corpo.formaPagamento
  if (formaPagamento !== 'PIX' && formaPagamento !== 'NA_LOJA') {
    throw new ErroApi('DADOS_INVALIDOS', 'Escolha a forma de pagamento: PIX ou NA_LOJA.')
  }
  const produto = await buscarProdutoAtivo(env.DB, produtoId)
  if (!produto) throw new ErroApi('NAO_ENCONTRADO', 'Esse produto não está mais disponível.')
  const { tamanho, cor } = lerEscolhas(produto, corpo.tamanho, corpo.cor)
  const cupom = await cupomDaReserva(env.DB, cliente.id, produto, quantidade, corpo.cupomId)
  const criada = await criarReserva(env.DB, { clienteId: cliente.id, produtoId, quantidade, formaPagamento, tamanho, cor, cupom })
  return json(reservaParaCliente((await buscarReserva(env.DB, criada.id))!), 201)
}
