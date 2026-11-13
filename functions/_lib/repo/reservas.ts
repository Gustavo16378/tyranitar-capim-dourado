// SQL de reserva. A criação baixa o estoque e grava a reserva numa transação só (RN03).
import { ErroApi } from '../erros'
import { deSqlite, paraSqlite } from '../regras/datas'
import { calcularExpiracao, mudarStatus, type FormaPagamento, type StatusReserva } from '../regras/reserva'
import { lerPrazosReserva } from './configuracao'
import { buscarProdutoAtivo } from './produtos'

const ATIVAS = "('PENDENTE', 'CONFIRMADA', 'SEPARADA')"

/**
 * Reservas ativas que passaram do prazo viram EXPIRADA e devolvem o estoque (RN01, RN02, RN03).
 * Pages Functions não roda tarefa agendada: isto é chamado antes de ler reservas.
 */
export async function expirarVencidas(
  db: D1Database,
  onde: { lojaId?: string; clienteId?: string; reservaId?: string },
  agora = new Date(),
) {
  const valores: string[] = [paraSqlite(agora)]
  const filtros = [`r.status IN ${ATIVAS}`, 'r.expira_em < ?1']
  if (onde.lojaId) filtros.push(`r.loja_id = ?${valores.push(onde.lojaId)}`)
  if (onde.clienteId) filtros.push(`r.cliente_id = ?${valores.push(onde.clienteId)}`)
  if (onde.reservaId) filtros.push(`r.id = ?${valores.push(onde.reservaId)}`)
  const vencidas = filtros.join(' AND ')
  await db.batch([
    db
      .prepare(
        `UPDATE produto SET estoque = estoque + (
           SELECT COALESCE(SUM(r.quantidade), 0) FROM reserva r WHERE r.produto_id = produto.id AND ${vencidas})
         WHERE id IN (SELECT r.produto_id FROM reserva r WHERE ${vencidas})`,
      )
      .bind(...valores),
    db
      .prepare(`UPDATE reserva AS r SET status = 'EXPIRADA', atualizado_em = ?1 WHERE ${vencidas}`)
      .bind(...valores),
  ])
}

export interface ReservaCompleta {
  id: string
  cliente_id: string
  cliente_nome: string
  produto_id: string
  produto_nome: string
  /** JSON com as fotos do produto. */
  produto_fotos: string
  loja_id: string
  loja_nome: string
  loja_piso: 1 | 2
  loja_mapa_id: string
  quantidade: number
  preco_centavos: number
  status: StatusReserva
  forma_pagamento: FormaPagamento
  pago: 0 | 1
  expira_em: string
  criado_em: string
}

const SELECAO = `
  SELECT r.id, r.cliente_id, u.nome AS cliente_nome, r.produto_id, p.nome AS produto_nome, p.fotos AS produto_fotos, r.loja_id,
         l.nome AS loja_nome, l.piso AS loja_piso, l.mapa_id AS loja_mapa_id, r.quantidade, r.preco_centavos, r.status, r.forma_pagamento, r.pago, r.expira_em, r.criado_em
  FROM reserva r JOIN produto p ON p.id = r.produto_id JOIN usuario u ON u.id = r.cliente_id
  JOIN loja l ON l.id = r.loja_id`

export function buscarReserva(db: D1Database, id: string) {
  return db.prepare(`${SELECAO} WHERE r.id = ?1`).bind(id).first<ReservaCompleta>()
}

/** Reserva como o painel da loja vê: o cliente só pelo primeiro nome. */
export function reservaParaLoja(r: ReservaCompleta) {
  return {
    id: r.id,
    produto: r.produto_nome,
    cliente: r.cliente_nome.split(' ')[0],
    quantidade: r.quantidade,
    status: r.status,
    formaPagamento: r.forma_pagamento,
    pago: r.pago === 1,
    /** O total da reserva (preço da unidade vezes a quantidade), como no app do cliente. */
    precoCentavos: r.preco_centavos * r.quantidade,
    expiraEm: deSqlite(r.expira_em).toISOString(),
    criadoEm: deSqlite(r.criado_em).toISOString(),
  }
}

/** Código "copia e cola" do Pix simulado da demonstração (não é um Pix de verdade). */
export function pixSimulado(id: string, centavos: number) {
  const valor = (centavos / 100).toFixed(2)
  return `00020126360014BR.GOV.BCB.PIX0114SIMULADO-${id.slice(0, 8)}520400005303986540${valor.length}${valor}5802BR5913CAPIM DOURADO6006PALMAS6304SIMU`
}

/** Reserva como o cliente vê (POST /api/reservas, pagamento): o Pix só quando a forma é PIX. */
export function reservaParaCliente(r: Pick<ReservaCompleta, 'id' | 'status' | 'forma_pagamento' | 'pago' | 'preco_centavos' | 'quantidade' | 'expira_em'>) {
  const total = r.preco_centavos * r.quantidade
  return {
    id: r.id,
    status: r.status,
    formaPagamento: r.forma_pagamento,
    pago: r.pago === 1,
    precoCentavos: total,
    expiraEm: deSqlite(r.expira_em).toISOString(),
    ...(r.forma_pagamento === 'PIX' ? { pix: { copiaECola: pixSimulado(r.id, total), simulado: true } } : {}),
  }
}

/** A reserva se for deste cliente; null se não existe ou é de outro (a rota responde 404 igual). */
export async function reservaDoCliente(db: D1Database, id: string, clienteId: string, agora = new Date()) {
  await expirarVencidas(db, { reservaId: id }, agora)
  const reserva = await buscarReserva(db, id)
  return reserva && reserva.cliente_id === clienteId ? reserva : null
}

/**
 * Confirma o Pix simulado (RN02): a reserva fica paga e passa a valer 48 h a partir de agora.
 * O status não muda (quem separa é a loja). Só uma reserva PIX ativa e ainda não paga.
 */
export async function pagarReserva(db: D1Database, reserva: ReservaCompleta, agora = new Date()) {
  const expira = calcularExpiracao(
    { forma: 'PIX', criadaEm: deSqlite(reserva.criado_em), pagaEm: agora },
    await lerPrazosReserva(db),
  )
  const { meta } = await db
    .prepare(
      `UPDATE reserva SET pago = 1, expira_em = ?2, atualizado_em = ?3
       WHERE id = ?1 AND forma_pagamento = 'PIX' AND pago = 0 AND status IN ${ATIVAS}`,
    )
    .bind(reserva.id, paraSqlite(expira), paraSqlite(agora))
    .run()
  if (meta.changes !== 1) throw new ErroApi('TRANSICAO_INVALIDA', 'Essa reserva não está esperando pagamento.')
  return (await buscarReserva(db, reserva.id))!
}

/** Reservas ativas do cliente; com lojaId, só as desta loja (as que o balcão pode atender). */
export async function reservasAtivasDoCliente(db: D1Database, clienteId: string, lojaId?: string) {
  const { results } = await db
    .prepare(
      `${SELECAO} WHERE r.cliente_id = ?1 AND r.status IN ${ATIVAS}${lojaId ? ' AND r.loja_id = ?2' : ''} ORDER BY r.expira_em`,
    )
    .bind(...(lojaId ? [clienteId, lojaId] : [clienteId]))
    .all<ReservaCompleta>()
  return results
}

/** Reservas da loja nos status pedidos, as que vencem primeiro na frente. */
export async function listarReservasDaLoja(
  db: D1Database,
  lojaId: string,
  status: StatusReserva[],
  pagina: { tamanho: number; inicio: number },
) {
  const [itens, contagem] = await db.batch([
    db
      .prepare(
        `${SELECAO} WHERE r.loja_id = ?1 AND r.status IN (SELECT value FROM json_each(?2))
         ORDER BY r.expira_em, r.id LIMIT ?3 OFFSET ?4`,
      )
      .bind(lojaId, JSON.stringify(status), pagina.tamanho, pagina.inicio),
    db
      .prepare('SELECT count(*) AS total FROM reserva WHERE loja_id = ?1 AND status IN (SELECT value FROM json_each(?2))')
      .bind(lojaId, JSON.stringify(status)),
  ])
  return {
    itens: (itens.results as ReservaCompleta[]).map(reservaParaLoja),
    total: (contagem.results[0] as { total: number }).total,
  }
}

/**
 * Muda o status pela loja, seguindo o diagrama (409 TRANSICAO_INVALIDA). Cancelar devolve o
 * estoque; separar avisa o cliente. Se a reserva mudou no meio (outro balcão), 409 também.
 */
export async function mudarStatusDaReserva(db: D1Database, reserva: ReservaCompleta, novo: StatusReserva, agora = new Date()) {
  mudarStatus(reserva.status, novo)
  const comandos = [
    db
      .prepare('UPDATE reserva SET status = ?2, atualizado_em = ?3 WHERE id = ?1 AND status = ?4')
      .bind(reserva.id, novo, paraSqlite(agora), reserva.status),
  ]
  if (novo === 'CANCELADA') {
    comandos.push(
      db
        .prepare("UPDATE produto SET estoque = estoque + ?2, atualizado_em = datetime('now') WHERE id = ?1 AND changes() = 1")
        .bind(reserva.produto_id, reserva.quantidade),
    )
  }
  if (novo === 'SEPARADA') {
    comandos.push(
      db
        .prepare(
          `INSERT INTO notificacao (id, usuario_id, tipo, titulo, corpo)
           SELECT ?1, ?2, 'RESERVA', 'Sua reserva está separada', ?3 WHERE changes() = 1`,
        )
        .bind(crypto.randomUUID(), reserva.cliente_id, `${reserva.produto_nome} está esperando por você no balcão.`),
    )
  }
  const [mudanca] = await db.batch(comandos)
  if (mudanca.meta.changes !== 1) {
    throw new ErroApi('TRANSICAO_INVALIDA', 'Essa reserva mudou enquanto isso. Atualize a lista e tente de novo.')
  }
  return (await buscarReserva(db, reserva.id))!
}

export interface ReservaCriada {
  id: string
  produtoId: string
  lojaId: string
  quantidade: number
  precoCentavos: number
  status: 'PENDENTE'
  formaPagamento: FormaPagamento
  pago: false
  expiraEm: string
}

/**
 * Cria a reserva descontando o estoque sem vender o que não tem: o UPDATE só baixa se houver
 * unidades, e o INSERT só acontece se o UPDATE mudou a linha (changes() = 1), no mesmo batch,
 * que o D1 roda numa transação. Duas pessoas nunca ficam com a última unidade.
 */
export async function criarReserva(
  db: D1Database,
  pedido: { clienteId: string; produtoId: string; quantidade: number; formaPagamento: FormaPagamento; agora?: Date },
): Promise<ReservaCriada> {
  if (!Number.isInteger(pedido.quantidade) || pedido.quantidade < 1 || pedido.quantidade > 5) {
    throw new ErroApi('DADOS_INVALIDOS', 'Dá para reservar de 1 a 5 unidades.')
  }
  const agora = pedido.agora ?? new Date()
  const expira = calcularExpiracao({ forma: pedido.formaPagamento, criadaEm: agora }, await lerPrazosReserva(db))
  const id = crypto.randomUUID()

  const [, insercao] = await db.batch([
    db
      .prepare(
        `UPDATE produto SET estoque = estoque - ?2, atualizado_em = datetime('now')
         WHERE id = ?1 AND ativo = 1 AND estoque >= ?2
           AND loja_id IN (SELECT id FROM loja WHERE ativa = 1)`,
      )
      .bind(pedido.produtoId, pedido.quantidade),
    db
      .prepare(
        `INSERT INTO reserva (id, cliente_id, produto_id, loja_id, quantidade, preco_centavos, status,
                              forma_pagamento, pago, expira_em, criado_em, atualizado_em)
         SELECT ?1, ?2, p.id, p.loja_id, ?3, p.preco_centavos, 'PENDENTE', ?4, 0, ?5, ?6, ?6
         FROM produto p WHERE p.id = ?7 AND changes() = 1`,
      )
      .bind(id, pedido.clienteId, pedido.quantidade, pedido.formaPagamento, paraSqlite(expira), paraSqlite(agora), pedido.produtoId),
  ])

  if (insercao.meta.changes !== 1) {
    const produto = await buscarProdutoAtivo(db, pedido.produtoId)
    if (!produto) throw new ErroApi('NAO_ENCONTRADO', 'Esse produto não está mais disponível.')
    throw new ErroApi('SEM_ESTOQUE', 'Esse produto acabou de esgotar nesta loja.')
  }

  const reserva = await db
    .prepare('SELECT loja_id, preco_centavos, expira_em FROM reserva WHERE id = ?1')
    .bind(id)
    .first<{ loja_id: string; preco_centavos: number; expira_em: string }>()
  return {
    id,
    produtoId: pedido.produtoId,
    lojaId: reserva!.loja_id,
    quantidade: pedido.quantidade,
    precoCentavos: reserva!.preco_centavos,
    status: 'PENDENTE',
    formaPagamento: pedido.formaPagamento,
    pago: false,
    expiraEm: deSqlite(reserva!.expira_em).toISOString(),
  }
}
