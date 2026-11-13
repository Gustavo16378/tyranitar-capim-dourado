// GET /api/me/carteira (CLIENTE): QR do balcão, saldo de pontos, nível (pelos pontos dos últimos
// 12 meses, RN08), quanto falta para o próximo, os cupons que o cliente pode usar e as reservas
// em aberto, com a loja (para o "Como chegar"). Cada cupom traz tipo, valor e nível mínimo para o
// app montar o canhoto.
import { exigirPerfil, type Rota } from '../../_lib/contexto'
import { ErroApi } from '../../_lib/erros'
import { json } from '../../_lib/http'
import { listarCuponsVigentes, paraVisibilidade, usosDoCliente } from '../../_lib/repo/cupons'
import { nivelDoCliente } from '../../_lib/repo/fidelidade'
import { categoriasDaFicha } from '../../_lib/repo/fichas'
import { expirarVencidas, reservasAtivasDoCliente } from '../../_lib/repo/reservas'
import { buscarUsuarioPorId } from '../../_lib/repo/usuarios'
import { clienteVeCupom } from '../../_lib/regras/cupons'
import { dataEmPalmas, deSqlite } from '../../_lib/regras/datas'

export const onRequestGet: Rota = async ({ env, data }) => {
  const { id } = exigirPerfil(data, 'CLIENTE')
  const agora = new Date()
  await expirarVencidas(env.DB, { clienteId: id }, agora)
  const [cliente, fidelidade, cupons, usos, categorias, reservas] = await Promise.all([
    buscarUsuarioPorId(env.DB, id),
    nivelDoCliente(env.DB, id, agora),
    listarCuponsVigentes(env.DB, dataEmPalmas(agora)),
    usosDoCliente(env.DB, id),
    categoriasDaFicha(env.DB, id),
    reservasAtivasDoCliente(env.DB, id),
  ])
  if (!cliente?.qr_token) throw new ErroApi('NAO_ENCONTRADO', 'Não achamos a sua carteira. Entre de novo.')

  return json({
    qrToken: cliente.qr_token,
    pontos: cliente.pontos,
    nivel: fidelidade.nivel,
    proximoNivel: fidelidade.proximo ? { nivel: fidelidade.proximo.nivel, faltam: fidelidade.proximo.faltam } : null,
    cupons: cupons
      .filter((c) => clienteVeCupom(paraVisibilidade(c), { nivel: fidelidade.nivel, usos, categorias }))
      .map((c) => ({
        id: c.id,
        titulo: c.titulo,
        loja: c.loja_id === null ? null : c.loja_nome,
        validade: c.validade,
        tipo: c.tipo,
        valor: c.valor,
        nivelMinimo: c.nivel_minimo,
      })),
    reservasAtivas: reservas.map((r) => ({
      id: r.id,
      produto: r.produto_nome,
      status: r.status,
      pago: r.pago === 1,
      expiraEm: deSqlite(r.expira_em).toISOString(),
      loja: { nome: r.loja_nome, piso: r.loja_piso, mapaId: r.loja_mapa_id },
    })),
  })
}
