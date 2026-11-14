// O que o vendedor vê ao ler o QR do cliente (RF18): nome e nível, a ficha filtrada pelas
// categorias da loja (RN04), as reservas dele nesta loja (com tamanho, valor, cupom e se já foi
// paga; só as confirmadas saem no balcão) e os cupons que ele pode usar aqui, com a categoria em que
// cada um desconta (RN15): o caixa só oferece o que tem item na compra.
import { ErroApi } from '../erros'
import { cuponsVigentesNaLoja, paraVisibilidade, usosDoCliente } from '../repo/cupons'
import { nivelDoCliente } from '../repo/fidelidade'
import { categoriasDaFicha, interessesDoCliente } from '../repo/fichas'
import { buscarLojaAtiva } from '../repo/lojas'
import { expirarVencidas, reservasAtivasDoCliente, valoresDaReserva } from '../repo/reservas'
import { buscarClientePorQr, type UsuarioLinha } from '../repo/usuarios'
import { dataEmPalmas } from '../regras/datas'
import { clienteVeCupom, paraQueVale } from '../regras/cupons'
import { filtrarFicha } from '../regras/ficha'
import type { NivelFidelidade } from '../regras/niveis'
import { PRONTAS_PARA_RETIRAR } from '../regras/reserva'
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

/**
 * Cupons que o cliente pode usar nesta loja agora: no nível dele e dentro do limite (o cupom preso
 * numa reserva conta como usado). No balcão, o cupom de categoria vale para quem leva um item dela,
 * então as categorias da loja contam como interesse, além das da ficha.
 */
export async function cuponsDoClienteNaLoja(db: D1Database, cliente: UsuarioLinha, lojaId: string, nivel: NivelFidelidade, agora: Date) {
  const [cupons, usos, ficha, daLoja] = await Promise.all([
    cuponsVigentesNaLoja(db, lojaId, dataEmPalmas(agora)),
    usosDoCliente(db, cliente.id),
    categoriasDaFicha(db, cliente.id),
    categoriasDaLoja(db, lojaId),
  ])
  const categorias = [...ficha, ...daLoja]
  return cupons.filter((c) => clienteVeCupom(paraVisibilidade(c), { nivel, usos, categorias }))
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
    reservas: reservas.map((r) => ({
      id: r.id,
      produto: r.produto_nome,
      foto: lerJson<string[]>(r.produto_fotos, [])[0] ?? null,
      categoria: r.produto_categoria,
      quantidade: r.quantidade,
      tamanho: r.tamanho,
      cor: r.cor,
      ...valoresDaReserva(r),
      cupom: r.cupom_id ? { id: r.cupom_id, titulo: r.cupom_titulo ?? '', origem: r.cupom_loja_id === null ? 'SHOPPING' : 'LOJA' } : null,
      status: r.status,
      pago: r.pago === 1,
      /** Confirmada pela loja: pode sair no balcão ("Retirar"). Pendente, a loja confirma antes. */
      podeRetirar: PRONTAS_PARA_RETIRAR.includes(r.status),
    })),
    cupons: cupons.map((c) => ({
      id: c.id,
      titulo: c.titulo,
      origem: c.loja_id === null ? 'SHOPPING' : 'LOJA',
      tipo: c.tipo,
      categoria: c.categoria_alvo,
      paraQueVale: paraQueVale({ categoria: c.categoria_alvo }),
    })),
  }
}
