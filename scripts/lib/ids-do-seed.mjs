// Os ids fixos do seed, num lugar só: o seed (scripts/gerar-seed.mjs) grava com eles, e o
// demo:reset (scripts/demo-reset.mjs) usa os mesmos para separar o que é do seed do que os
// ensaios criaram (as compras da Ana e os cupons). Mudar um nome aqui muda o id no banco.
import { createHash } from 'node:crypto'

/** UUID v5 (determinístico) a partir de um nome, no espaço de nomes do projeto. */
export function uuid(nome) {
  const espaco = Buffer.from('6ba7b8119dad11d180b400c04fd430c8', 'hex') // namespace URL da RFC 4122
  const bytes = createHash('sha1').update(espaco).update(`tyranitar:${nome}`).digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** A cliente da demonstração (POST /api/auth/demo entra com ela). */
export const EMAIL_DA_ANA = 'ana.souza@demo.test'

/**
 * O histórico da Ana: compras no caixa em lojas diferentes nos últimos 12 meses, somando os
 * 2.140 pontos do saldo dela (RN07: 1 ponto por real). Alimentam o nível (RN08) e os relatórios.
 * A loja de cada uma o seed escolhe pela ordem das lojas com produto.
 */
export const HISTORICO_DA_ANA = [
  { dias: 300, valor: 45980, comFicha: 0 },
  { dias: 240, valor: 18990, comFicha: 0 },
  { dias: 170, valor: 24900, comFicha: 1 },
  { dias: 95, valor: 39990, comFicha: 1 },
  { dias: 40, valor: 52000, comFicha: 0 },
  { dias: 12, valor: 32400, comFicha: 1 },
].map((c, i) => ({ ...c, id: uuid(`compra:ana:${i + 1}`), pontos: Math.floor(c.valor / 100) }))

/** O saldo da Ana no seed: a soma dos pontos do histórico. */
export const PONTOS_DA_ANA = HISTORICO_DA_ANA.reduce((soma, c) => soma + c.pontos, 0)

/** O id de um cupom do seed pelo nome. */
export const idDoCupom = (nome) => uuid(`cupom:${nome}`)

/** Os nomes dos cupons do seed: dois da loja do primeiro calçado e dois vouchers do shopping. */
export const CUPONS_DO_SEED = ['10-calcados', '15-camisetas', '20-reais-shopping', 'estacionamento']
