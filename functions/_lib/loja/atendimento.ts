// O que o vendedor vê ao ler o QR do cliente (RF18): nome e nível, a ficha filtrada pelas
// categorias da loja (RN04), as reservas dele nesta loja e os cupons que ele pode usar aqui.
import { ErroApi } from '../erros'
import { usosDoCliente, cuponsVigentesNaLoja } from '../repo/cupons'
import { nivelDoCliente } from '../repo/fidelidade'
import { categoriasDaFicha, interessesDoCliente } from '../repo/fichas'
import { buscarLojaAtiva } from '../repo/lojas'
import { expirarVencidas, reservasAtivasDoCliente } from '../repo/reservas'
import { buscarClientePorQr, type UsuarioLinha } from '../repo/usuarios'
import { dataEmPalmas } from '../regras/datas'
import { filtrarFicha } from '../regras/ficha'
import { nivelAtende, type NivelFidelidade } from '../regras/niveis'
import { lerJson } from '../texto'

export const QR_DESCONHECIDO = 'Não achamos esse QR. Peça para o cliente abrir a carteira de novo.'

/** O cliente do QR, ou 404. */
export async function clienteDoQr(db: D1Database, qr: string): Promise<UsuarioLinha> {
  const cliente = await buscarClientePorQr(db, qr)
  if (!cliente) throw new ErroApi('NAO_ENCONTRADO', QR_DESCONHECIDO)
  return cliente
}

/** Categorias que a loja vende (filtram a ficha). */
export async function categoriasDaLoja(db: D1Database, lojaId: string) {
  return lerJson<string[]>((await buscarLojaAtiva(db, lojaId))?.categorias, [])
}

/** Cupons que o cliente pode usar nesta loja agora: no nível dele, dentro do limite e da ficha. */
export async function cuponsDoClienteNaLoja(db: D1Database, cliente: UsuarioLinha, lojaId: string, nivel: NivelFidelidade, agora: Date) {
  const [cupons, usos, categorias] = await Promise.all([
    cuponsVigentesNaLoja(db, lojaId, dataEmPalmas(agora)),
    usosDoCliente(db, cliente.id),
    categoriasDaFicha(db, cliente.id),
  ])
  return cupons.filter(
    (c) =>
      nivelAtende(nivel, c.nivel_minimo) &&
      (usos[c.id] ?? 0) < c.limite_por_cliente &&
      (c.categoria_alvo === null || categorias.includes(c.categoria_alvo)),
  )
}

export async function montarAtendimento(db: D1Database, lojaId: string, qr: string, agora = new Date()) {
  const cliente = await clienteDoQr(db, qr)
  await expirarVencidas(db, { clienteId: cliente.id, lojaId }, agora)
  const [{ nivel }, interesses, categorias, reservas] = await Promise.all([
    nivelDoCliente(db, cliente.id, agora),
    interessesDoCliente(db, cliente.id),
    categoriasDaLoja(db, lojaId),
    reservasAtivasDoCliente(db, cliente.id, lojaId),
  ])
  const cupons = await cuponsDoClienteNaLoja(db, cliente, lojaId, nivel, agora)
  return {
    // Só o primeiro nome; o vendedor nunca vê a conversa com a Capi (RNF06).
    cliente: { nome: cliente.nome.split(' ')[0], nivel },
    ficha: filtrarFicha(interesses, categorias, cliente.consentimento_ficha === 1),
    reservas: reservas.map((r) => ({ id: r.id, produto: r.produto_nome, status: r.status, pago: r.pago === 1 })),
    cupons: cupons.map((c) => ({ id: c.id, titulo: c.titulo, origem: c.loja_id === null ? 'SHOPPING' : 'LOJA' })),
  }
}
