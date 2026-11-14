// SQL das compras do cliente (Minhas compras, na Carteira): a loja, o valor pago, os cupons
// usados e os pontos de cada compra registrada no caixa ou pela nota.
import { deSqlite } from '../regras/datas'
import { lerJson } from '../texto'

interface CompraLinha {
  id: string
  criado_em: string
  valor_centavos: number
  pontos_gerados: number
  loja_id: string
  loja_nome: string
  loja_piso: 1 | 2
  loja_mapa_id: string
  cupons: string
}

/** Compra no formato de GET /api/me/compras. */
function compraParaApi(c: CompraLinha) {
  return {
    id: c.id,
    criadoEm: deSqlite(c.criado_em).toISOString(),
    loja: { id: c.loja_id, nome: c.loja_nome, piso: c.loja_piso, mapaId: c.loja_mapa_id },
    valorPagoCentavos: c.valor_centavos,
    cupons: lerJson<{ titulo: string; descontoCentavos: number }[]>(c.cupons, []),
    pontosGerados: c.pontos_gerados,
  }
}

/** As compras do cliente, da mais nova para a mais antiga, com os cupons de cada uma (o maior desconto primeiro). */
export async function listarComprasDoCliente(
  db: D1Database,
  clienteId: string,
  pagina: { tamanho: number; inicio: number },
) {
  const [itens, contagem] = await db.batch([
    db
      .prepare(
        `SELECT c.id, c.criado_em, c.valor_centavos, c.pontos_gerados,
                l.id AS loja_id, l.nome AS loja_nome, l.piso AS loja_piso, l.mapa_id AS loja_mapa_id,
                (SELECT json_group_array(json_object('titulo', titulo, 'descontoCentavos', desconto))
                 FROM (SELECT cp.titulo, u.desconto_centavos AS desconto
                       FROM uso_cupom u JOIN cupom cp ON cp.id = u.cupom_id
                       WHERE u.compra_id = c.id ORDER BY u.desconto_centavos DESC, cp.titulo)) AS cupons
         FROM compra c JOIN loja l ON l.id = c.loja_id
         WHERE c.cliente_id = ?1
         ORDER BY c.criado_em DESC, c.id DESC LIMIT ?2 OFFSET ?3`,
      )
      .bind(clienteId, pagina.tamanho, pagina.inicio),
    db.prepare('SELECT count(*) AS total FROM compra WHERE cliente_id = ?1').bind(clienteId),
  ])
  return {
    itens: (itens.results as CompraLinha[]).map(compraParaApi),
    total: (contagem.results[0] as { total: number }).total,
  }
}
