// POST /api/reservas (CLIENTE): { produtoId, quantidade, formaPagamento } → 201 com a reserva.
// O estoque baixa na hora, sem vender o que não tem (RN03). Pagar na loja vale 4 h (RN01);
// Pix ainda não pago também, e depois de pago vale 48 h (RN02).
import { exigirPerfil, type Rota } from '../../_lib/contexto'
import { ErroApi } from '../../_lib/erros'
import { json, lerCorpo, texto } from '../../_lib/http'
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
  const criada = await criarReserva(env.DB, { clienteId: cliente.id, produtoId, quantidade, formaPagamento })
  return json(reservaParaCliente((await buscarReserva(env.DB, criada.id))!), 201)
}
