// Histórico da conversa com a Capi (tabela mensagem).

export interface MensagemLinha {
  id: string
  papel: 'CLIENTE' | 'CAPI'
  conteudo: string
  criado_em: string
}

export async function salvarMensagem(db: D1Database, clienteId: string, papel: 'CLIENTE' | 'CAPI', conteudo: string) {
  await db
    .prepare('INSERT INTO mensagem (id, cliente_id, papel, conteudo) VALUES (?1, ?2, ?3, ?4)')
    .bind(crypto.randomUUID(), clienteId, papel, conteudo)
    .run()
}

/** As últimas mensagens do cliente, da mais antiga para a mais nova. */
export async function ultimasMensagens(db: D1Database, clienteId: string, limite: number) {
  const { results } = await db
    .prepare(
      `SELECT id, papel, conteudo, criado_em FROM mensagem WHERE cliente_id = ?1
       ORDER BY criado_em DESC, rowid DESC LIMIT ?2`,
    )
    .bind(clienteId, limite)
    .all<MensagemLinha>()
  return results.reverse()
}
