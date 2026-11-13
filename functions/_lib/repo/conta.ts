// SQL da conta do cliente (tela Minha conta): dados, nome, consentimento da ficha, exportação
// dos dados (LGPD) e exclusão.
import { ErroApi } from '../erros'
import { deSqlite, paraSqlite } from '../regras/datas'
import type { Interesse } from '../regras/ficha'
import { lerJson } from '../texto'
import { nivelDoCliente } from './fidelidade'

/** E-mails das contas excluídas: domínio reservado (.invalid), nunca entrega nem colide. */
const DOMINIO_EXCLUIDA = '@conta-excluida.invalid'

/** O que sobra da senha de uma conta excluída: não é um hash, então nenhuma senha confere. */
const SEM_SENHA = 'excluida'

const ABERTAS = "('PENDENTE', 'CONFIRMADA', 'SEPARADA')"

interface LinhaDaConta {
  id: string
  nome: string
  email: string
  pontos: number
  consentimento_ficha: 0 | 1
}

/** A conta do cliente como a API devolve, ou null se ela não existe ou foi excluída. */
export async function buscarConta(db: D1Database, clienteId: string, agora = new Date()) {
  const linha = await db
    .prepare(
      `SELECT id, nome, email, pontos, consentimento_ficha FROM usuario
       WHERE id = ?1 AND perfil = 'CLIENTE' AND email NOT LIKE ?2`,
    )
    .bind(clienteId, `%${DOMINIO_EXCLUIDA}`)
    .first<LinhaDaConta>()
  if (!linha) return null
  const { nivel } = await nivelDoCliente(db, clienteId, agora)
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    nivel,
    pontos: linha.pontos,
    compartilharFicha: linha.consentimento_ficha === 1,
  }
}

/** A conta logada; se ela foi excluída, o token não vale mais (401: o app volta para o login). */
export async function contaLogada(db: D1Database, clienteId: string) {
  const conta = await buscarConta(db, clienteId)
  if (!conta) throw new ErroApi('NAO_AUTENTICADO', 'Essa conta não existe mais. Entre com outra conta.')
  return conta
}

/** A conta de demonstração (POST /api/auth/demo) é de todo mundo que testa o app. */
const EMAIL_DA_DEMONSTRACAO = 'ana.souza@demo.test'

/** Com a demo ligada, a conta de demonstração não é excluída nem troca de senha. */
export function ehContaDaDemonstracao(conta: { email: string }, env: Pick<Env, 'DEMO'>) {
  return env.DEMO === '1' && conta.email.toLowerCase() === EMAIL_DA_DEMONSTRACAO
}

/**
 * Liga ou desliga o compartilhamento da ficha com as lojas (RF13). Desligar apaga a ficha na
 * hora (RNF06); ligar de novo começa com a ficha vazia, que a Capi preenche nas conversas.
 */
export async function mudarConsentimento(db: D1Database, clienteId: string, compartilhar: boolean) {
  const comandos = [
    db.prepare('UPDATE usuario SET consentimento_ficha = ?2 WHERE id = ?1').bind(clienteId, compartilhar ? 1 : 0),
  ]
  if (!compartilhar) comandos.push(db.prepare('DELETE FROM ficha WHERE cliente_id = ?1').bind(clienteId))
  await db.batch(comandos)
}

/**
 * Exclui a conta (LGPD). As compras ficam, porque são o registro das lojas (vendas, pontos e
 * reembolsos), mas presas a uma conta sem dados pessoais: sem nome, e-mail, senha, QR, ficha,
 * conversa, favoritos, notificações nem avaliações. As buscas ficam anônimas (RN12). As
 * reservas em aberto são canceladas e o estoque volta (RN03). Tudo numa transação (db.batch).
 */
export async function excluirConta(db: D1Database, clienteId: string, agora = new Date()) {
  await db.batch([
    // Primeiro o estoque, enquanto as reservas ainda estão em aberto.
    db
      .prepare(
        `UPDATE produto SET estoque = estoque + (
           SELECT SUM(r.quantidade) FROM reserva r
           WHERE r.produto_id = produto.id AND r.cliente_id = ?1 AND r.status IN ${ABERTAS}
         ), atualizado_em = ?2
         WHERE id IN (SELECT produto_id FROM reserva WHERE cliente_id = ?1 AND status IN ${ABERTAS})`,
      )
      .bind(clienteId, paraSqlite(agora)),
    db
      .prepare(
        // A paga por Pix fica com o estorno pedido, como quando o cliente cancela uma.
        `UPDATE reserva SET status = 'CANCELADA', estorno_solicitado = pago, atualizado_em = ?2
         WHERE cliente_id = ?1 AND status IN ${ABERTAS}`,
      )
      .bind(clienteId, paraSqlite(agora)),
    db.prepare('DELETE FROM ficha WHERE cliente_id = ?1').bind(clienteId),
    db.prepare('DELETE FROM mensagem WHERE cliente_id = ?1').bind(clienteId),
    db.prepare('DELETE FROM favorito WHERE cliente_id = ?1').bind(clienteId),
    db.prepare('DELETE FROM notificacao WHERE usuario_id = ?1').bind(clienteId),
    db.prepare('DELETE FROM avaliacao WHERE cliente_id = ?1').bind(clienteId),
    db.prepare('UPDATE busca SET cliente_id = NULL WHERE cliente_id = ?1').bind(clienteId),
    db
      .prepare(
        `UPDATE usuario SET nome = 'Conta excluída', email = ?2, senha_hash = ?3, qr_token = NULL,
           pontos = 0, consentimento_ficha = 0
         WHERE id = ?1`,
      )
      .bind(clienteId, `${clienteId}${DOMINIO_EXCLUIDA}`, SEM_SENHA),
  ])
}

/** Troca o nome do cliente (Minha conta). */
export async function mudarNome(db: D1Database, clienteId: string, nome: string) {
  await db.prepare("UPDATE usuario SET nome = ?2 WHERE id = ?1 AND perfil = 'CLIENTE'").bind(clienteId, nome).run()
}

/**
 * Tudo o que o app guarda sobre o cliente, para ele baixar (LGPD, art. 18: acesso e
 * portabilidade). Fica de fora o que não é dado dele, e sim segredo do sistema: o hash da senha,
 * o código do QR da carteira e as consultas técnicas que a Capi guarda junto das respostas.
 */
export async function dadosDoCliente(db: D1Database, clienteId: string, agora = new Date()) {
  const conta = await buscarConta(db, clienteId, agora)
  if (!conta) return null
  const todas = <T>(sql: string) =>
    db
      .prepare(sql)
      .bind(clienteId)
      .all<T>()
      .then((r) => r.results)
  const [criacao, ficha, reservas, compras, cupons, favoritos, mensagens, buscas, notificacoes, avaliacoes] =
    await Promise.all([
      db.prepare('SELECT criado_em FROM usuario WHERE id = ?1').bind(clienteId).first<{ criado_em: string }>(),
      db
        .prepare('SELECT interesses, atualizado_em FROM ficha WHERE cliente_id = ?1')
        .bind(clienteId)
        .first<{ interesses: string; atualizado_em: string }>(),
      todas<LinhaDeReserva>(
        `SELECT r.id, r.produto_id, p.nome AS produto, l.nome AS loja, r.quantidade, r.preco_centavos, r.status,
                r.forma_pagamento, r.pago, r.expira_em, r.criado_em
         FROM reserva r JOIN produto p ON p.id = r.produto_id JOIN loja l ON l.id = r.loja_id
         WHERE r.cliente_id = ?1 ORDER BY r.criado_em DESC`,
      ),
      todas<LinhaDeCompra>(
        `SELECT c.id, l.nome AS loja, c.valor_centavos, c.origem, c.chave_nfce, c.pontos_gerados, c.reserva_id, c.criado_em
         FROM compra c JOIN loja l ON l.id = c.loja_id
         WHERE c.cliente_id = ?1 ORDER BY c.criado_em DESC`,
      ),
      todas<{ compra_id: string; titulo: string; desconto_centavos: number }>(
        `SELECT u.compra_id, cp.titulo, u.desconto_centavos
         FROM uso_cupom u JOIN cupom cp ON cp.id = u.cupom_id JOIN compra c ON c.id = u.compra_id
         WHERE c.cliente_id = ?1`,
      ),
      todas<{ produto_id: string; nome: string; criado_em: string }>(
        `SELECT f.produto_id, p.nome, f.criado_em FROM favorito f JOIN produto p ON p.id = f.produto_id
         WHERE f.cliente_id = ?1 ORDER BY f.criado_em DESC`,
      ),
      todas<{ papel: string; conteudo: string; criado_em: string }>(
        'SELECT papel, conteudo, criado_em FROM mensagem WHERE cliente_id = ?1 ORDER BY criado_em, rowid',
      ),
      todas<{ termo: string; categoria: string | null; encontrou: 0 | 1; criado_em: string }>(
        'SELECT termo, categoria, encontrou, criado_em FROM busca WHERE cliente_id = ?1 ORDER BY criado_em DESC',
      ),
      todas<{ tipo: string; titulo: string; corpo: string; lida: 0 | 1; criado_em: string }>(
        'SELECT tipo, titulo, corpo, lida, criado_em FROM notificacao WHERE usuario_id = ?1 ORDER BY criado_em DESC',
      ),
      todas<{ produto_id: string; nota: number; comentario: string; criado_em: string }>(
        'SELECT produto_id, nota, comentario, criado_em FROM avaliacao WHERE cliente_id = ?1 ORDER BY criado_em DESC',
      ),
    ])

  const data = (sqlite: string) => deSqlite(sqlite).toISOString()
  return {
    geradoEm: agora.toISOString(),
    conta: { ...conta, criadaEm: criacao ? data(criacao.criado_em) : null },
    ficha: ficha
      ? { interesses: lerJson<Interesse[]>(ficha.interesses, []), atualizadaEm: data(ficha.atualizado_em) }
      : null,
    reservas: reservas.map((r) => ({
      id: r.id,
      produto: { id: r.produto_id, nome: r.produto },
      loja: r.loja,
      quantidade: r.quantidade,
      precoCentavos: r.preco_centavos,
      status: r.status,
      formaPagamento: r.forma_pagamento,
      pago: r.pago === 1,
      expiraEm: data(r.expira_em),
      criadaEm: data(r.criado_em),
    })),
    compras: compras.map((c) => ({
      id: c.id,
      loja: c.loja,
      valorCentavos: c.valor_centavos,
      origem: c.origem,
      chaveNfce: c.chave_nfce,
      pontosGerados: c.pontos_gerados,
      reservaId: c.reserva_id,
      cupons: cupons
        .filter((u) => u.compra_id === c.id)
        .map((u) => ({ titulo: u.titulo, descontoCentavos: u.desconto_centavos })),
      criadaEm: data(c.criado_em),
    })),
    favoritos: favoritos.map((f) => ({ produto: { id: f.produto_id, nome: f.nome }, salvoEm: data(f.criado_em) })),
    conversaComACapi: mensagens.map((m) => ({ papel: m.papel, conteudo: m.conteudo, criadaEm: data(m.criado_em) })),
    buscas: buscas.map((b) => ({
      termo: b.termo,
      categoria: b.categoria,
      encontrou: b.encontrou === 1,
      feitaEm: data(b.criado_em),
    })),
    notificacoes: notificacoes.map((n) => ({
      tipo: n.tipo,
      titulo: n.titulo,
      corpo: n.corpo,
      lida: n.lida === 1,
      criadaEm: data(n.criado_em),
    })),
    avaliacoes: avaliacoes.map((a) => ({
      produtoId: a.produto_id,
      nota: a.nota,
      comentario: a.comentario,
      criadaEm: data(a.criado_em),
    })),
  }
}

interface LinhaDeReserva {
  id: string
  produto_id: string
  produto: string
  loja: string
  quantidade: number
  preco_centavos: number
  status: string
  forma_pagamento: string
  pago: 0 | 1
  expira_em: string
  criado_em: string
}

interface LinhaDeCompra {
  id: string
  loja: string
  valor_centavos: number
  origem: string
  chave_nfce: string | null
  pontos_gerados: number
  reserva_id: string | null
  criado_em: string
}
