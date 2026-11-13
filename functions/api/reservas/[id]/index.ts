// GET /api/reservas/{id}: a reserva do cliente logado, com o produto no formato da busca (a tela
// da reserva abre pelo link /reserva/{id}). Esta rota confere sozinha o perfil CLIENTE e o dono:
// reserva de outro cliente responde 404, igual a uma que não existe. O prazo é conferido na
// leitura: vencida, vem EXPIRADA e o estoque volta (RN01 a RN03).
import { exigirPerfil, type Rota } from '../../../_lib/contexto'
import { ErroApi } from '../../../_lib/erros'
import { json } from '../../../_lib/http'
import { buscarProdutoQualquer, produtoParaApi } from '../../../_lib/repo/produtos'
import { reservaDoCliente, reservaParaCliente } from '../../../_lib/repo/reservas'

export const onRequestGet: Rota<'id'> = async ({ params, env, data }) => {
  const cliente = exigirPerfil(data, 'CLIENTE')
  const reserva = await reservaDoCliente(env.DB, String(params.id), cliente.id)
  if (!reserva) throw new ErroApi('NAO_ENCONTRADO', 'Não achamos essa reserva.')
  const produto = await buscarProdutoQualquer(env.DB, reserva.produto_id)
  return json({ ...reservaParaCliente(reserva), produto: produto ? produtoParaApi(produto) : null })
}
