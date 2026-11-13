// GET /api/ofertas (público): cupons ativos e válidos das lojas e do shopping.
// Sem login: os cupons abertos a todos. Com token de cliente: só os do nível dele que ainda
// pode usar (RN06), os de categoria-alvo da ficha dele, e destaque para as categorias da ficha.
import type { Rota } from '../../_lib/contexto'
import { json, paginacao } from '../../_lib/http'
import { lerLimitesNivel } from '../../_lib/repo/configuracao'
import { listarCuponsVigentes, usosDoCliente, type CupomLinha } from '../../_lib/repo/cupons'
import { categoriasDaFicha } from '../../_lib/repo/fichas'
import { buscarUsuarioPorId } from '../../_lib/repo/usuarios'
import { dataEmPalmas } from '../../_lib/regras/datas'
import { nivelAtende, nivelPorPontos, type NivelFidelidade } from '../../_lib/regras/niveis'
import { lerJson } from '../../_lib/texto'

interface Cliente {
  nivel: NivelFidelidade
  categorias: Set<string>
  usos: Record<string, number>
}

async function lerCliente(db: D1Database, id: string): Promise<Cliente | null> {
  const [usuario, limites, categorias, usos] = await Promise.all([
    buscarUsuarioPorId(db, id),
    lerLimitesNivel(db),
    categoriasDaFicha(db, id),
    usosDoCliente(db, id),
  ])
  if (!usuario) return null
  return { nivel: nivelPorPontos(usuario.pontos, limites), categorias: new Set(categorias), usos }
}

function visivel(c: CupomLinha, cliente: Cliente | null) {
  if (!cliente) return c.categoria_alvo === null
  return (
    nivelAtende(cliente.nivel, c.nivel_minimo) &&
    (cliente.usos[c.id] ?? 0) < c.limite_por_cliente &&
    (c.categoria_alvo === null || cliente.categorias.has(c.categoria_alvo))
  )
}

function emDestaque(c: CupomLinha, cliente: Cliente | null) {
  if (!cliente) return false
  const categorias = [c.categoria_alvo, ...lerJson<string[]>(c.loja_categorias, [])]
  return categorias.some((cat) => cat !== null && cliente.categorias.has(cat))
}

export const onRequestGet: Rota = async ({ request, env, data }) => {
  const pagina = paginacao(new URL(request.url))
  const usuario = data.usuario
  const [cupons, cliente] = await Promise.all([
    listarCuponsVigentes(env.DB, dataEmPalmas(new Date())),
    usuario?.perfil === 'CLIENTE' ? lerCliente(env.DB, usuario.id) : null,
  ])

  const ofertas = cupons
    .filter((c) => visivel(c, cliente))
    .map((c) => ({
      id: c.id,
      titulo: c.titulo,
      tipo: c.tipo,
      valor: c.valor,
      origem: c.loja_id === null ? 'SHOPPING' : 'LOJA',
      loja: c.loja_id === null ? null : { id: c.loja_id, nome: c.loja_nome, mapaId: c.loja_mapa_id },
      categoriaAlvo: c.categoria_alvo,
      nivelMinimo: c.nivel_minimo,
      validade: c.validade,
      destaque: emDestaque(c, cliente),
    }))
    .sort((a, b) => Number(b.destaque) - Number(a.destaque))

  return json({ itens: ofertas.slice(pagina.inicio, pagina.inicio + pagina.tamanho), total: ofertas.length })
}
