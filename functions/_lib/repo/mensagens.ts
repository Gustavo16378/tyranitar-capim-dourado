// Histórico da conversa com a Capi (tabela mensagem).

export interface MensagemLinha {
  id: string
  papel: 'CLIENTE' | 'CAPI'
  conteudo: string
  /** Só nas respostas da Capi: as consultas que ela fez (JSON, mensagens da API do Claude). */
  troca: string | null
  criado_em: string
}

export async function salvarMensagem(
  db: D1Database,
  clienteId: string,
  papel: 'CLIENTE' | 'CAPI',
  conteudo: string,
  troca: string | null = null,
) {
  await db
    .prepare('INSERT INTO mensagem (id, cliente_id, papel, conteudo, troca) VALUES (?1, ?2, ?3, ?4, ?5)')
    .bind(crypto.randomUUID(), clienteId, papel, conteudo, troca)
    .run()
}

/** "Nova conversa": apaga a conversa do cliente com a Capi. Devolve quantas mensagens saíram. */
export async function apagarConversa(db: D1Database, clienteId: string) {
  const { n } = (await db.prepare('SELECT count(*) AS n FROM mensagem WHERE cliente_id = ?1').bind(clienteId).first<{ n: number }>())!
  await db.prepare('DELETE FROM mensagem WHERE cliente_id = ?1').bind(clienteId).run()
  return n
}

/** As últimas mensagens do cliente, da mais antiga para a mais nova. */
export async function ultimasMensagens(db: D1Database, clienteId: string, limite: number) {
  const { results } = await db
    .prepare(
      `SELECT id, papel, conteudo, troca, criado_em FROM mensagem WHERE cliente_id = ?1
       ORDER BY criado_em DESC, rowid DESC LIMIT ?2`,
    )
    .bind(clienteId, limite)
    .all<MensagemLinha>()
  return results.reverse()
}
