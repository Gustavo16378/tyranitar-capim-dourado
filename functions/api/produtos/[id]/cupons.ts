// GET /api/produtos/{id}/cupons (CLIENTE): os cupons do cliente que valem para o produto, com o
// desconto que dariam na reserva (?quantidade=, padrão 1), e as opções de tamanho e cor dele. A
// folha de reservar mostra isto; o cupom escolhido vai em POST /api/reservas (RN15).
import { cuponsParaOProduto, opcoesDoProduto } from '../../../_lib/cliente/reservar'
import { exigirPerfil, type Rota } from '../../../_lib/contexto'
import { ErroApi } from '../../../_lib/erros'
import { json } from '../../../_lib/http'
import { buscarProdutoAtivo } from '../../../_lib/repo/produtos'

export const onRequestGet: Rota<'id'> = async ({ request, params, env, data }) => {
  const cliente = exigirPerfil(data, 'CLIENTE')
  const produto = await buscarProdutoAtivo(env.DB, String(params.id))
  if (!produto) throw new ErroApi('NAO_ENCONTRADO', 'Esse produto não está mais disponível.')
  const quantidade = Number(new URL(request.url).searchParams.get('quantidade') ?? 1)
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 5) throw new ErroApi('DADOS_INVALIDOS', 'A quantidade vai de 1 a 5.')
  return json({ ...opcoesDoProduto(produto), itens: await cuponsParaOProduto(env.DB, cliente.id, produto, quantidade) })
}
