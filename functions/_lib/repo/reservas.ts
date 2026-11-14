// SQL de reserva. A criação baixa o estoque e grava a reserva numa transação só (RN03). Cada
// mudança de status deixa um aviso para o cliente (tabela notificacao), que o app mostra.
import { ErroApi } from '../erros'
import { deSqlite, paraSqlite } from '../regras/datas'
import { calcularExpiracao, mudarStatus, type FormaPagamento, type StatusReserva } from '../regras/reserva'
import { lerPrazosReserva } from './configuracao'
import { buscarProdutoAtivo } from './produtos'

const ATIVAS = "('PENDENTE', 'CONFIRMADA', 'SEPARADA')"

/** "15:30", no horário de Palmas. */
export function horaEmPalmas(data: Date) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Araguaina', hour: '2-digit', minute: '2-digit' }).format(data)
}

/** O aviso de uma mudança da reserva, para o app (destino: a tela da reserva). */
function aviso(db: D1Database, clienteId: string, reservaId: string, titulo: string, corpo: string, condicao = '') {
  return db
    .prepare(
      `INSERT INTO notificacao (id, usuario_id, tipo, titulo, corpo, destino)
       SELECT ?1, ?2, 'RESERVA', ?3, ?4, ?5${condicao ? ` WHERE ${condicao}` : ''}`,
    )
    .bind(crypto.randomUUID(), clienteId, titulo, corpo, `/reserva/${reservaId}`)
}

/**
 * Reservas ativas que passaram do prazo viram EXPIRADA, devolvem o estoque (RN01, RN02, RN03),
 * soltam o cupom e, se foram pagas, pedem o estorno. O cliente recebe o aviso.
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
        `INSERT INTO notificacao (id, usuario_id, tipo, titulo, corpo, destino)
         SELECT lower(hex(randomblob(16))), r.cliente_id, 'RESERVA', 'Sua reserva expirou',
                p.nome || ' voltou para a loja: o prazo para retirar acabou.', '/reserva/' || r.id
         FROM reserva r JOIN produto p ON p.id = r.produto_id WHERE ${vencidas}`,
      )
      .bind(...valores),
    db
      .prepare(
        `UPDATE produto SET estoque = estoque + (
           SELECT COALESCE(SUM(r.quantidade), 0) FROM reserva r WHERE r.produto_id = produto.id AND ${vencidas})
         WHERE id IN (SELECT r.produto_id FROM reserva r WHERE ${vencidas})`,
      )
      .bind(...valores),
    db
      .prepare(`UPDATE reserva AS r SET status = 'EXPIRADA', estorno_solicitado = pago, atualizado_em = ?1 WHERE ${vencidas}`)
      .bind(...valores),
  ])
}

export interface ReservaCompleta {
  id: string
  cliente_id: string
  cliente_nome: string
  produto_id: string
  produto_nome: string
  produto_categoria: string
  /** JSON com as fotos do produto. */
  produto_fotos: string
  loja_id: string
  loja_nome: string
  loja_piso: 1 | 2
  loja_mapa_id: string
  quantidade: number
  /** Preço de uma unidade, sem desconto. */
  preco_centavos: number
  status: StatusReserva
  forma_pagamento: FormaPagamento
  pago: 0 | 1
  /** 1 quando a reserva saiu depois de paga por Pix (cancelada, recusada ou expirada): o estorno (simulado) foi pedido. */
  estorno_solicitado: 0 | 1
  expira_em: string
  criado_em: string
  tamanho: string | null
  cor: string | null
  cupom_id: string | null
  cupom_titulo: string | null
  cupom_loja_id: string | null
  desconto_centavos: number
  pronta_em: string | null
  motivo_recusa: string | null
}

const SELECAO = `
  SELECT r.id, r.cliente_id, u.nome AS cliente_nome, r.produto_id, p.nome AS produto_nome, p.categoria AS produto_categoria,
         p.fotos AS produto_fotos, r.loja_id, l.nome AS loja_nome, l.piso AS loja_piso, l.mapa_id AS loja_mapa_id,
         r.quantidade, r.preco_centavos, r.status, r.forma_pagamento, r.pago, r.estorno_solicitado, r.expira_em, r.criado_em,
         r.tamanho, r.cor, r.cupom_id, k.titulo AS cupom_titulo, k.loja_id AS cupom_loja_id, r.desconto_centavos,
         r.pronta_em, r.motivo_recusa
  FROM reserva r JOIN produto p ON p.id = r.produto_id JOIN usuario u ON u.id = r.cliente_id
  JOIN loja l ON l.id = r.loja_id LEFT JOIN cupom k ON k.id = r.cupom_id`

export function buscarReserva(db: D1Database, id: string) {
  return db.prepare(`${SELECAO} WHERE r.id = ?1`).bind(id).first<ReservaCompleta>()
}

/** Os valores da reserva: o bruto (preço × quantidade), o desconto do cupom e o total. */
export function valoresDaReserva(r: Pick<ReservaCompleta, 'preco_centavos' | 'quantidade' | 'desconto_centavos'>) {
  const bruto = r.preco_centavos * r.quantidade
  return { brutoCentavos: bruto, descontoCentavos: r.desconto_centavos, precoCentavos: bruto - r.desconto_centavos }
}

const cupomDaReserva = (r: ReservaCompleta) =>
  r.cupom_id ? { id: r.cupom_id, titulo: r.cupom_titulo ?? '', origem: r.cupom_loja_id === null ? 'SHOPPING' : 'LOJA' } : null

const iso = (data: string | null) => (data ? deSqlite(data).toISOString() : null)

/** Reserva como o painel da loja vê: o cliente só pelo primeiro nome. */
export function reservaParaLoja(r: ReservaCompleta) {
  return {
    id: r.id,
    produto: r.produto_nome,
    cliente: r.cliente_nome.split(' ')[0],
    quantidade: r.quantidade,
    tamanho: r.tamanho,
    cor: r.cor,
    status: r.status,
    formaPagamento: r.forma_pagamento,
    pago: r.pago === 1,
    estornoSolicitado: r.estorno_solicitado === 1,
    /** O total da reserva, já com o desconto do cupom, como no app do cliente. */
    ...valoresDaReserva(r),
    cupom: cupomDaReserva(r),
    prontaEm: iso(r.pronta_em),
    motivoRecusa: r.motivo_recusa,
    expiraEm: deSqlite(r.expira_em).toISOString(),
    criadoEm: deSqlite(r.criado_em).toISOString(),
  }
}

/** Código "copia e cola" do Pix simulado da demonstração (não é um Pix de verdade). */
export function pixSimulado(id: string, centavos: number) {
  const valor = (centavos / 100).toFixed(2)
  return `00020126360014BR.GOV.BCB.PIX0114SIMULADO-${id.slice(0, 8)}520400005303986540${valor.length}${valor}5802BR5913CAPIM DOURADO6006PALMAS6304SIMU`
}

/** Reserva como o cliente vê (POST /api/reservas, pagamento, cancelar): o Pix só quando a forma é PIX, já com o desconto. */
export function reservaParaCliente(r: ReservaCompleta) {
  const valores = valoresDaReserva(r)
  return {
    id: r.id,
    status: r.status,
    formaPagamento: r.forma_pagamento,
    pago: r.pago === 1,
    estornoSolicitado: r.estorno_solicitado === 1,
    ...valores,
    tamanho: r.tamanho,
    cor: r.cor,
    cupom: cupomDaReserva(r),
    prontaEm: iso(r.pronta_em),
    motivoRecusa: r.motivo_recusa,
    expiraEm: deSqlite(r.expira_em).toISOString(),
    ...(r.forma_pagamento === 'PIX' ? { pix: { copiaECola: pixSimulado(r.id, valores.precoCentavos), simulado: true } } : {}),
  }
}

/** A reserva se for deste cliente; null se não existe ou é de outro (a rota responde 404 igual). */
export async function reservaDoCliente(db: D1Database, id: string, clienteId: string, agora = new Date()) {
  await expirarVencidas(db, { reservaId: id }, agora)
  const reserva = await buscarReserva(db, id)
  return reserva && reserva.cliente_id === clienteId ? reserva : null
}

/**
 * Confirma o Pix simulado (RN02): a reserva fica paga. Já confirmada pela loja, o prazo para retirar
 * passa a ser o do Pix (48 h desde a hora em que fica pronta). O status não muda. Só uma reserva
 * PIX ativa e ainda não paga.
 */
export async function pagarReserva(db: D1Database, reserva: ReservaCompleta, agora = new Date()) {
  const expira = reserva.pronta_em
    ? calcularExpiracao(
        { forma: 'PIX', criadaEm: deSqlite(reserva.criado_em), prontaEm: deSqlite(reserva.pronta_em), pago: true },
        await lerPrazosReserva(db),
      )
    : deSqlite(reserva.expira_em)
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

/** Reservas da loja nos status pedidos: as pendentes primeiro (a loja precisa responder), depois as que vencem antes. */
export async function listarReservasDaLoja(
  db: D1Database,
  lojaId: string,
  status: StatusReserva[],
  pagina: { tamanho: number; inicio: number },
) {
  const [itens, contagem, pendentes] = await db.batch([
    db
      .prepare(
        `${SELECAO} WHERE r.loja_id = ?1 AND r.status IN (SELECT value FROM json_each(?2))
         ORDER BY r.status <> 'PENDENTE', r.expira_em, r.id LIMIT ?3 OFFSET ?4`,
      )
      .bind(lojaId, JSON.stringify(status), pagina.tamanho, pagina.inicio),
    db
      .prepare('SELECT count(*) AS total FROM reserva WHERE loja_id = ?1 AND status IN (SELECT value FROM json_each(?2))')
      .bind(lojaId, JSON.stringify(status)),
    db.prepare("SELECT count(*) AS total FROM reserva WHERE loja_id = ?1 AND status = 'PENDENTE'").bind(lojaId),
  ])
  return {
    itens: (itens.results as ReservaCompleta[]).map(reservaParaLoja),
    total: (contagem.results[0] as { total: number }).total,
    /** Quantas esperam a loja confirmar ou recusar (o selo do menu Reservas). */
    pendentes: (pendentes.results[0] as { total: number }).total,
  }
}

export interface DetalhesDaMudanca {
  agora?: Date
  /** CONFIRMADA: a hora em que fica pronta para retirar (o prazo conta dela). */
  prontaEm?: Date
  /** RECUSADA: o motivo, que o cliente vê. */
  motivo?: string
}

/**
 * Muda o status, seguindo o diagrama (409 TRANSICAO_INVALIDA), e avisa o cliente.
 * - CONFIRMADA: grava a hora em que fica pronta e o prazo para retirar a partir dela.
 * - SEPARADA: o produto está no balcão.
 * - CANCELADA (o cliente) e RECUSADA (a loja, com motivo): o estoque volta, o cupom fica livre e,
 *   se estava paga por Pix, o estorno (simulado) fica pedido.
 * Se a reserva mudou no meio (outro balcão, ou o cliente e a loja ao mesmo tempo), 409 também.
 */
export async function mudarStatusDaReserva(
  db: D1Database,
  reserva: ReservaCompleta,
  novo: StatusReserva,
  { agora = new Date(), prontaEm, motivo }: DetalhesDaMudanca = {},
) {
  mudarStatus(reserva.status, novo)
  const extras: string[] = []
  const valores: unknown[] = [reserva.id, novo, paraSqlite(agora), reserva.status]
  const devolve = novo === 'CANCELADA' || novo === 'RECUSADA'
  // Só reserva paga pode ter estorno (CHECK da migration 0004): pago já diz se é Pix pago.
  if (devolve) extras.push('estorno_solicitado = pago')
  if (novo === 'CONFIRMADA') {
    const pronta = prontaEm ?? agora
    const expira = calcularExpiracao(
      { forma: reserva.forma_pagamento, criadaEm: deSqlite(reserva.criado_em), prontaEm: pronta, pago: reserva.pago === 1 },
      await lerPrazosReserva(db),
    )
    extras.push(`pronta_em = ?${valores.push(paraSqlite(pronta))}`, `expira_em = ?${valores.push(paraSqlite(expira))}`)
  }
  if (novo === 'RECUSADA') {
    if (!motivo?.trim()) throw new ErroApi('DADOS_INVALIDOS', 'Diga ao cliente por que a reserva foi recusada.')
    extras.push(`motivo_recusa = ?${valores.push(motivo.trim().slice(0, 200))}`)
  }
  const comandos = [
    db
      .prepare(`UPDATE reserva SET status = ?2, atualizado_em = ?3${extras.map((e) => `, ${e}`).join('')} WHERE id = ?1 AND status = ?4`)
      .bind(...valores),
  ]
  if (devolve) {
    comandos.push(
      db
        .prepare("UPDATE produto SET estoque = estoque + ?2, atualizado_em = datetime('now') WHERE id = ?1 AND changes() = 1")
        .bind(reserva.produto_id, reserva.quantidade),
    )
  }
  const produto = reserva.produto_nome
  const estorno = reserva.pago === 1 ? ' O estorno do Pix foi pedido.' : ''
  const avisos: Partial<Record<StatusReserva, [string, string]>> = {
    CONFIRMADA: [
      `${reserva.loja_nome} confirmou sua reserva`,
      `${produto} fica pronto para retirar a partir das ${horaEmPalmas(prontaEm ?? agora)}.`,
    ],
    SEPARADA: ['Sua reserva está separada', `${produto} está esperando por você no balcão da ${reserva.loja_nome}.`],
    RECUSADA: [`${reserva.loja_nome} recusou sua reserva`, `${produto}: ${motivo?.trim()}.${estorno}`],
    CANCELADA: ['Reserva cancelada', `${produto} voltou para a loja.${estorno}`],
  }
  const textos = avisos[novo]
  if (textos) comandos.push(aviso(db, reserva.cliente_id, reserva.id, textos[0], textos[1], 'changes() = 1'))
  const [mudanca] = await db.batch(comandos)
  if (mudanca.meta.changes !== 1) {
    throw new ErroApi('TRANSICAO_INVALIDA', 'Essa reserva mudou enquanto isso. Atualize a lista e tente de novo.')
  }
  return (await buscarReserva(db, reserva.id))!
}

/** Por que o cliente não pode mais cancelar, nas palavras do app. */
const NAO_CANCELA: Partial<Record<StatusReserva, string>> = {
  RETIRADA: 'Essa reserva já foi retirada: não dá mais para cancelar.',
  CANCELADA: 'Essa reserva já está cancelada.',
  RECUSADA: 'A loja recusou essa reserva, e o produto já voltou para ela.',
  EXPIRADA: 'Essa reserva já expirou, e o produto voltou para a loja.',
}

/**
 * O cliente cancela a própria reserva enquanto ela está em aberto (PENDENTE, CONFIRMADA ou
 * SEPARADA): o estoque volta na hora, o cupom fica livre e, se estava paga por Pix, o estorno fica
 * pedido. Retirada, cancelada, recusada ou expirada: 409 TRANSICAO_INVALIDA.
 */
export function cancelarPeloCliente(db: D1Database, reserva: ReservaCompleta, agora = new Date()) {
  const motivo = NAO_CANCELA[reserva.status]
  if (motivo) throw new ErroApi('TRANSICAO_INVALIDA', motivo)
  return mudarStatusDaReserva(db, reserva, 'CANCELADA', { agora })
}

export interface ReservaCriada {
  id: string
  produtoId: string
  lojaId: string
  quantidade: number
  /** O total, já com o desconto do cupom. */
  precoCentavos: number
  status: 'PENDENTE'
  formaPagamento: FormaPagamento
  pago: false
  expiraEm: string
}

/**
 * Cria a reserva descontando o estoque sem vender o que não tem: o UPDATE só baixa se houver
 * unidades, e o INSERT só acontece se o UPDATE mudou a linha (changes() = 1), no mesmo batch,
 * que o D1 roda numa transação. Duas pessoas nunca ficam com a última unidade. O cupom (já conferido
 * por quem chama) fica preso à reserva, com o desconto calculado. O cliente recebe o aviso.
 */
export async function criarReserva(
  db: D1Database,
  pedido: {
    clienteId: string
    produtoId: string
    quantidade: number
    formaPagamento: FormaPagamento
    tamanho?: string | null
    cor?: string | null
    cupom?: { id: string; descontoCentavos: number } | null
    agora?: Date
  },
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
                              forma_pagamento, pago, expira_em, criado_em, atualizado_em, tamanho, cor, cupom_id, desconto_centavos)
         SELECT ?1, ?2, p.id, p.loja_id, ?3, p.preco_centavos, 'PENDENTE', ?4, 0, ?5, ?6, ?6, ?8, ?9, ?10, ?11
         FROM produto p WHERE p.id = ?7 AND changes() = 1`,
      )
      .bind(
        id,
        pedido.clienteId,
        pedido.quantidade,
        pedido.formaPagamento,
        paraSqlite(expira),
        paraSqlite(agora),
        pedido.produtoId,
        pedido.tamanho ?? null,
        pedido.cor ?? null,
        pedido.cupom?.id ?? null,
        pedido.cupom?.descontoCentavos ?? 0,
      ),
    db
      .prepare(
        `INSERT INTO notificacao (id, usuario_id, tipo, titulo, corpo, destino)
         SELECT ?1, r.cliente_id, 'RESERVA', 'Reserva enviada para a loja',
                p.nome || ': a ' || l.nome || ' vai confirmar e dizer a partir de que horas fica pronto.', '/reserva/' || r.id
         FROM reserva r JOIN produto p ON p.id = r.produto_id JOIN loja l ON l.id = r.loja_id WHERE r.id = ?2`,
      )
      .bind(crypto.randomUUID(), id),
  ])

  if (insercao.meta.changes !== 1) {
    const produto = await buscarProdutoAtivo(db, pedido.produtoId)
    if (!produto) throw new ErroApi('NAO_ENCONTRADO', 'Esse produto não está mais disponível.')
    throw new ErroApi('SEM_ESTOQUE', 'Esse produto acabou de esgotar nesta loja.')
  }

  const reserva = (await buscarReserva(db, id))!
  return {
    id,
    produtoId: pedido.produtoId,
    lojaId: reserva.loja_id,
    quantidade: pedido.quantidade,
    precoCentavos: valoresDaReserva(reserva).precoCentavos,
    status: 'PENDENTE',
    formaPagamento: pedido.formaPagamento,
    pago: false,
    expiraEm: deSqlite(reserva.expira_em).toISOString(),
  }
}
