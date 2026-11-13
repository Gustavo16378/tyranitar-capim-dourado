// SQL da conta do cliente (tela Minha conta): dados, consentimento da ficha e exclusão.
import { paraSqlite } from '../regras/datas'
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
        `UPDATE reserva SET status = 'CANCELADA', atualizado_em = ?2 WHERE cliente_id = ?1 AND status IN ${ABERTAS}`,
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
