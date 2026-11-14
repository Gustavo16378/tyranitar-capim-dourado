// SQL da tabela favorito: salvar e tirar um produto dos salvos do cliente ("Salvos para
// provar"). A lista, com os produtos no formato da busca, fica em repo/produtos.ts
// (listarFavoritos).

/** Salva o produto. Salvar de novo não muda nada, nem a data em que foi salvo. */
export function salvarFavorito(db: D1Database, clienteId: string, produtoId: string) {
  return db
    .prepare('INSERT INTO favorito (cliente_id, produto_id) VALUES (?1, ?2) ON CONFLICT DO NOTHING')
    .bind(clienteId, produtoId)
    .run()
}

/** Tira o produto dos salvos (se estava lá). */
export function tirarFavorito(db: D1Database, clienteId: string, produtoId: string) {
  return db.prepare('DELETE FROM favorito WHERE cliente_id = ?1 AND produto_id = ?2').bind(clienteId, produtoId).run()
}
