// O SQL do demo:reset (scripts/demo-reset.mjs): volta a conta de demonstração ao seed. Sem
// dependência do Node, para o teste de API (tests/api/demo-reset.test.ts) rodar o mesmo SQL no
// D1 de teste. Só mexe na cliente da demonstração; as contas de outras pessoas ficam como estão.
//
// O que os ensaios deixam e o reset desfaz:
// - compras no balcão que não são do seed, com o que a compra grava junto: os itens, os usos de
//   cupom (que tiravam os cupons da carteira), o reembolso do voucher do shopping, as avaliações e
//   o aviso "Você ganhou N pontos";
// - reservas (as abertas prendiam o estoque; todas contavam nos relatórios da loja);
// - a conversa com a Capi, as buscas que ela fez e a ficha que ela anotou;
// - o saldo, recalculado pelas compras que sobram (as do seed). O nível sai das compras dos
//   últimos 12 meses (functions/_lib/repo/fidelidade.ts), então volta sozinho.

const texto = (valor) => `'${String(valor).replaceAll("'", "''")}'`
const ids = (lista) => `(SELECT value FROM json_each(${texto(JSON.stringify(lista))}))`

/**
 * Os comandos que limpam a conta. `contagem` vem antes (o D1 local não diz quantas linhas cada
 * comando mudou); a ordem dos `comandos` respeita as chaves estrangeiras.
 */
export function sqlDaLimpeza({ email, comprasDoSeed, cuponsDoSeed }) {
  const cliente = `(SELECT id FROM usuario WHERE email = ${texto(email)})`
  const deTeste = `(SELECT id FROM compra WHERE cliente_id = ${cliente} AND id NOT IN ${ids(comprasDoSeed)})`
  // Uma reserva ligada a uma compra que fica (nenhuma do seed tem) não pode sair.
  const reservas = `reserva WHERE cliente_id = ${cliente}
    AND id NOT IN (SELECT reserva_id FROM compra WHERE reserva_id IS NOT NULL AND id NOT IN ${deTeste})
    AND id NOT IN (SELECT reserva_id FROM compra_item WHERE reserva_id IS NOT NULL AND compra_id NOT IN ${deTeste})`
  return {
    contagem: `SELECT
  (SELECT count(*) FROM compra WHERE id IN ${deTeste}) AS compras,
  (SELECT COALESCE(sum(pontos_gerados), 0) FROM compra WHERE id IN ${deTeste}) AS pontos,
  (SELECT count(*) FROM uso_cupom WHERE compra_id IN ${deTeste}) AS usos_de_cupom,
  (SELECT count(*) FROM reembolso WHERE compra_id IN ${deTeste}) AS reembolsos,
  (SELECT count(*) FROM ${reservas}) AS reservas,
  (SELECT count(*) FROM notificacao WHERE usuario_id = ${cliente}) AS avisos,
  (SELECT count(*) FROM mensagem WHERE cliente_id = ${cliente}) AS mensagens,
  (SELECT count(*) FROM busca WHERE cliente_id = ${cliente}) AS buscas`,
    comandos: [
      `DELETE FROM reembolso WHERE compra_id IN ${deTeste}`,
      `DELETE FROM uso_cupom WHERE compra_id IN ${deTeste}`,
      `DELETE FROM avaliacao WHERE compra_id IN ${deTeste}`,
      `DELETE FROM compra_item WHERE compra_id IN ${deTeste}`,
      `DELETE FROM compra WHERE id IN ${deTeste}`,
      `DELETE FROM ${reservas}`,
      // "Você ganhou N pontos" e os avisos das reservas: o seed não cria nenhum.
      `DELETE FROM notificacao WHERE usuario_id = ${cliente}`,
      `DELETE FROM mensagem WHERE cliente_id = ${cliente}`,
      // As buscas da Capi nos ensaios entravam nos "mais buscados" das lojas; as do seed não têm cliente.
      `DELETE FROM busca WHERE cliente_id = ${cliente}`,
      // A Capi anota na ficha o que a Ana procura nos ensaios: o seed põe de volta só a do roteiro.
      `DELETE FROM ficha WHERE cliente_id = ${cliente}`,
      `UPDATE usuario SET consentimento_ficha = 1 WHERE id = ${cliente}`,
      // Um cupom do seed desligado no painel durante os ensaios volta a valer.
      `UPDATE cupom SET ativo = 1 WHERE id IN ${ids(cuponsDoSeed)}`,
    ],
  }
}

/** O saldo pelas compras que ficaram. Roda depois do seed, que repõe uma compra do histórico que falte. */
export function sqlDoSaldo(email) {
  return `UPDATE usuario SET pontos = (SELECT COALESCE(sum(pontos_gerados), 0) FROM compra WHERE cliente_id = usuario.id)
WHERE email = ${texto(email)}`
}

/** As consultas do resumo, na ordem que `resumoDoReset` lê: a cliente, os cupons e o extrato da loja da demo. */
export function sqlDoResumo({ email, comprasDoSeed, emailDoLojista }) {
  const cliente = `(SELECT id FROM usuario WHERE email = ${texto(email)})`
  const loja = `(SELECT loja_id FROM usuario WHERE email = ${texto(emailDoLojista)})`
  return [
    `SELECT u.pontos,
  (SELECT count(*) FROM compra WHERE cliente_id = u.id) AS compras,
  (SELECT COALESCE(sum(pontos_gerados), 0) FROM compra WHERE cliente_id = u.id AND criado_em >= datetime('now', '-1 year')) AS pontos_no_ano,
  (SELECT valor FROM configuracao WHERE chave = 'niveis') AS niveis,
  (SELECT interesses FROM ficha WHERE cliente_id = u.id) AS interesses
FROM usuario u WHERE u.email = ${texto(email)}`,
    // Os vigentes (ativos, na validade em Palmas, de loja ativa ou do shopping), com os usos dela.
    `SELECT k.titulo, k.nivel_minimo, k.limite_por_cliente, k.categoria_alvo,
  (SELECT count(*) FROM uso_cupom x JOIN compra c ON c.id = x.compra_id WHERE x.cupom_id = k.id AND c.cliente_id = ${cliente}) AS usos
FROM cupom k LEFT JOIN loja l ON l.id = k.loja_id
WHERE k.ativo = 1 AND k.validade >= date('now', '-3 hours') AND (k.loja_id IS NULL OR l.ativa = 1)
ORDER BY k.validade, k.titulo`,
    // O extrato da loja da demonstração: as compras no caixa dos últimos 30 dias (o período padrão).
    `SELECT (SELECT nome FROM loja WHERE id = ${loja}) AS loja,
  count(*) AS compras,
  COALESCE(sum(c.id IN ${ids(comprasDoSeed)}), 0) AS do_seed,
  COALESCE(sum(c.cliente_id <> ${cliente}), 0) AS de_outros_clientes,
  (SELECT count(*) FROM reembolso WHERE loja_id = ${loja}) AS reembolsos
FROM compra c WHERE c.loja_id = ${loja} AND c.origem = 'CAIXA' AND c.criado_em >= datetime('now', '-30 days')`,
  ]
}

const NIVEIS = ['SEMENTE', 'BROTO', 'CAPIM', 'DOURADO']

/** O nível pelos pontos dos últimos 12 meses e os limites da configuração (regras/niveis.ts). */
function nivelPorPontos(pontos, limites) {
  return NIVEIS.filter((nivel) => pontos >= (limites[nivel] ?? Infinity)).at(-1) ?? 'SEMENTE'
}

/** O resumo a partir das linhas de `sqlDoResumo`: o que a carteira da Ana e o extrato da loja vão mostrar. */
export function resumoDoReset([[ana], cupons, [extrato]]) {
  if (!ana) throw new Error('a conta de demonstração não está no banco')
  let limites = {}
  try {
    limites = JSON.parse(ana.niveis ?? '{}')
  } catch {
    // Sem a configuração, o nível sai como Semente; o resto do resumo vale igual.
  }
  const nivel = nivelPorPontos(ana.pontos_no_ano, limites)
  let categorias = new Set()
  try {
    categorias = new Set(JSON.parse(ana.interesses ?? '[]').map((i) => i.categoria))
  } catch {
    // Ficha ilegível: os cupons com categoria-alvo não contam.
  }
  // Como clienteVeCupom (functions/_lib/regras/cupons.ts): nível, limite de usos e categoria-alvo.
  const disponiveis = cupons
    .filter(
      (k) =>
        NIVEIS.indexOf(nivel) >= NIVEIS.indexOf(k.nivel_minimo) &&
        k.usos < k.limite_por_cliente &&
        (k.categoria_alvo === null || categorias.has(k.categoria_alvo)),
    )
    .map((k) => k.titulo)
  return {
    pontos: ana.pontos,
    compras: ana.compras,
    nivel,
    cupons: disponiveis,
    extrato: {
      loja: extrato?.loja ?? null,
      compras: extrato?.compras ?? 0,
      doSeed: extrato?.do_seed ?? 0,
      deOutrosClientes: extrato?.de_outros_clientes ?? 0,
      reembolsos: extrato?.reembolsos ?? 0,
    },
  }
}
