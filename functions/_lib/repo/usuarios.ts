// SQL da tabela usuario. Sempre prepare().bind(), nunca texto concatenado.
import type { Perfil } from '../auth/jwt'

export interface UsuarioLinha {
  id: string
  nome: string
  email: string
  senha_hash: string
  perfil: Perfil
  loja_id: string | null
  qr_token: string | null
  pontos: number
  consentimento_ficha: 0 | 1
}

const COLUNAS = 'id, nome, email, senha_hash, perfil, loja_id, qr_token, pontos, consentimento_ficha'

/** O e-mail não diferencia maiúsculas (a coluna é COLLATE NOCASE). */
export function buscarUsuarioPorEmail(db: D1Database, email: string) {
  return db.prepare(`SELECT ${COLUNAS} FROM usuario WHERE email = ?1`).bind(email).first<UsuarioLinha>()
}

/** O cliente dono do QR da carteira (o vendedor lê no balcão). */
export function buscarClientePorQr(db: D1Database, qrToken: string) {
  return db
    .prepare(`SELECT ${COLUNAS} FROM usuario WHERE qr_token = ?1 AND perfil = 'CLIENTE'`)
    .bind(qrToken)
    .first<UsuarioLinha>()
}

export function buscarUsuarioPorId(db: D1Database, id: string) {
  return db.prepare(`SELECT ${COLUNAS} FROM usuario WHERE id = ?1`).bind(id).first<UsuarioLinha>()
}

export async function atualizarSenhaHash(db: D1Database, id: string, senhaHash: string) {
  await db.prepare('UPDATE usuario SET senha_hash = ?2 WHERE id = ?1').bind(id, senhaHash).run()
}

export async function criarCliente(
  db: D1Database,
  cliente: { id: string; nome: string; email: string; senhaHash: string; qrToken: string; consentimentoFicha?: boolean },
) {
  await db
    .prepare(
      `INSERT INTO usuario (id, nome, email, senha_hash, perfil, qr_token, consentimento_ficha)
       VALUES (?1, ?2, ?3, ?4, 'CLIENTE', ?5, ?6)`,
    )
    .bind(cliente.id, cliente.nome, cliente.email, cliente.senhaHash, cliente.qrToken, cliente.consentimentoFicha ? 1 : 0)
    .run()
}
