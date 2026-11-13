// RN12: toda busca fica registrada para os relatórios de demanda (que nunca mostram quem buscou).

export function registrarBusca(
  db: D1Database,
  busca: { clienteId: string | null; termo: string; categoria: string | null; encontrou: boolean },
) {
  return db
    .prepare('INSERT INTO busca (id, cliente_id, termo, categoria, encontrou) VALUES (?1, ?2, ?3, ?4, ?5)')
    .bind(crypto.randomUUID(), busca.clienteId, busca.termo, busca.categoria, busca.encontrou ? 1 : 0)
    .run()
}
