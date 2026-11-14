// O corpo de um cupom novo, igual no cupom da loja (POST /api/loja/cupons) e no voucher do
// shopping (POST /api/shopping/cupons). As regras são as da tabela cupom e da RN06.
// A edição e a exclusão (PUT e DELETE /api/loja/cupons/{id} e /api/shopping/cupons/{id}) também
// ficam aqui, iguais nos dois painéis: a loja só mexe nos cupons dela; o shopping, nos vouchers.
import { ErroApi } from '../erros'
import {
  atualizarCupom,
  buscarCupomComUso,
  cupomEmUso,
  excluirCupomSemUso,
  type CupomComUsoLinha,
  type NovoCupom,
} from '../repo/cupons'
import { ORDEM_NIVEIS, type NivelFidelidade } from '../regras/niveis'

const TIPOS = ['PERCENTUAL', 'VALOR', 'BRINDE'] as const

const invalido = (mensagem: string) => new ErroApi('DADOS_INVALIDOS', mensagem)

/** Valida o corpo; categorias são as que o cupom pode mirar. hoje: a data em Palmas. */
export function lerPedidoCupom(corpo: Record<string, unknown>, categorias: readonly string[], hoje: string): NovoCupom {
  const titulo = typeof corpo.titulo === 'string' ? corpo.titulo.trim() : ''
  if (titulo.length < 3 || titulo.length > 60) throw invalido('O título precisa ter de 3 a 60 caracteres.')
  const tipo = corpo.tipo as NovoCupom['tipo']
  if (!TIPOS.includes(tipo)) throw invalido('O tipo é PERCENTUAL, VALOR ou BRINDE.')
  const valor = corpo.valor
  if (typeof valor !== 'number' || !Number.isInteger(valor)) throw invalido('O valor do desconto precisa ser um número inteiro.')
  if (tipo === 'PERCENTUAL' && (valor < 1 || valor > 100)) throw invalido('O desconto em porcentagem vai de 1 a 100.')
  if (tipo === 'VALOR' && valor <= 0) throw invalido('O desconto em reais precisa ser maior que zero.')
  if (tipo === 'BRINDE' && valor !== 0) throw invalido('Cupom de brinde não tem valor de desconto.')
  const categoriaAlvo = corpo.categoriaAlvo ?? null
  if (categoriaAlvo !== null && (typeof categoriaAlvo !== 'string' || !categorias.includes(categoriaAlvo))) {
    throw invalido('Categoria desconhecida.')
  }
  const nivelMinimo = corpo.nivelMinimo as NivelFidelidade
  if (!ORDEM_NIVEIS.includes(nivelMinimo)) throw invalido('O nível mínimo vai de SEMENTE a DOURADO.')
  const limite = corpo.limitePorCliente
  if (typeof limite !== 'number' || !Number.isInteger(limite) || limite < 1 || limite > 99) {
    throw invalido('O limite por cliente vai de 1 a 99 usos.')
  }
  const validade = corpo.validade
  if (typeof validade !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(validade)) throw invalido('A validade vai como "2026-12-31".')
  if (validade < hoje) throw invalido('A validade não pode ser antes de hoje.')
  return { titulo, tipo, valor, categoriaAlvo, nivelMinimo, limitePorCliente: limite, validade }
}

/** Os campos que o corpo da edição pode trazer; os que não vierem ficam como estão. */
const CAMPOS = ['titulo', 'tipo', 'valor', 'categoriaAlvo', 'nivelMinimo', 'limitePorCliente', 'validade'] as const

/** O que não muda depois que o cupom foi usado ou entrou numa reserva. */
const TRAVADOS = [
  ['tipo', 'o tipo'],
  ['valor', 'o valor'],
  ['categoriaAlvo', 'a categoria'],
  ['nivelMinimo', 'o nível mínimo'],
] as const

/**
 * O corpo da edição sobre o cupom atual: os campos que vierem substituem os de agora e o resultado
 * passa pelas regras da criação. A validade que já passou só vale se não mudou (desativar um
 * cupom vencido, por exemplo). `ativo`, se vier, é true ou false.
 */
export function lerEdicaoCupom(
  corpo: Record<string, unknown>,
  atual: CupomComUsoLinha,
  categorias: readonly string[],
  hoje: string,
): NovoCupom & { ativo: boolean } {
  const antes: Record<(typeof CAMPOS)[number], unknown> = {
    titulo: atual.titulo,
    tipo: atual.tipo,
    valor: atual.valor,
    categoriaAlvo: atual.categoria_alvo,
    nivelMinimo: atual.nivel_minimo,
    limitePorCliente: atual.limite_por_cliente,
    validade: atual.validade,
  }
  const mesclado: Record<string, unknown> = { ...antes }
  for (const campo of CAMPOS) if (corpo[campo] !== undefined) mesclado[campo] = corpo[campo]
  if (corpo.ativo !== undefined && typeof corpo.ativo !== 'boolean') throw invalido('O campo ativo é true ou false.')
  const mesmaValidade = mesclado.validade === atual.validade
  const cupom = lerPedidoCupom(mesclado, categorias, mesmaValidade ? '0000-00-00' : hoje)
  return { ...cupom, ativo: typeof corpo.ativo === 'boolean' ? corpo.ativo : atual.ativo === 1 }
}

/**
 * O cupom pedido, se for de quem pede: `dono` é a loja do lojista, ou null no painel do shopping
 * (só os vouchers). Não existe: 404; é de outro dono: 403.
 */
async function cupomDoDono(db: D1Database, id: string, dono: string | null) {
  const cupom = await buscarCupomComUso(db, id)
  if (!cupom) throw new ErroApi('NAO_ENCONTRADO', 'Esse cupom não existe.')
  if (cupom.loja_id !== dono) {
    const mensagem =
      dono === null
        ? 'Esse cupom é de uma loja: só a própria loja mexe nele.'
        : cupom.loja_id === null
          ? 'Esse é um voucher do shopping: só a administração do shopping mexe nele.'
          : 'Esse cupom é de outra loja.'
    throw new ErroApi('SEM_PERMISSAO', mensagem)
  }
  return cupom
}

const EM_USO = 'Esse cupom já foi usado numa compra ou está numa reserva'

/**
 * PUT: edita, desativa ou reativa. Nunca usado e sem reserva, tudo muda. Já usado (ou preso numa
 * reserva), só o título, a validade, o limite por cliente e o ativo: mudar o tipo, o valor, a
 * categoria ou o nível mínimo é 409. A reserva já feita guarda o desconto dela, mesmo com o
 * cupom desativado (o caixa usa o desconto gravado na reserva).
 */
export async function editarCupom(db: D1Database, id: string, dono: string | null, corpo: Record<string, unknown>, categorias: readonly string[], hoje: string) {
  const atual = await cupomDoDono(db, id, dono)
  const edicao = lerEdicaoCupom(corpo, atual, categorias, hoje)
  const antes = { tipo: atual.tipo, valor: atual.valor, categoriaAlvo: atual.categoria_alvo, nivelMinimo: atual.nivel_minimo }
  const mudaram = TRAVADOS.filter(([campo]) => edicao[campo] !== antes[campo]).map(([, nome]) => nome)
  const emUso = cupomEmUso(atual)
  if (emUso && mudaram.length) {
    throw new ErroApi(
      'CUPOM_EM_USO',
      `${EM_USO}: ${juntar(mudaram)} não ${mudaram.length === 1 ? 'muda' : 'mudam'} mais. Dá para mudar o título, a validade e o limite por cliente, ou desativar este e criar outro.`,
    )
  }
  const gravou = await atualizarCupom(db, id, edicao, { soLivres: emUso || !mudaram.length })
  if (!gravou) throw new ErroApi('CUPOM_EM_USO', `${EM_USO} agora há pouco. Abra o cupom de novo para ver o que ainda dá para mudar.`)
  return (await buscarCupomComUso(db, id))!
}

/** DELETE: só o cupom nunca usado e sem reserva. Com uso, 409, sugerindo desativar. */
export async function excluirCupom(db: D1Database, id: string, dono: string | null) {
  const atual = await cupomDoDono(db, id, dono)
  const recusa = `${EM_USO}, então não pode ser excluído: o histórico das compras e das reservas depende dele. Desative o cupom: ele some para os clientes e o histórico fica.`
  if (cupomEmUso(atual)) throw new ErroApi('CUPOM_EM_USO', recusa)
  if (!(await excluirCupomSemUso(db, id))) throw new ErroApi('CUPOM_EM_USO', recusa)
}

/** "o tipo", "o tipo e o valor", "o tipo, o valor e a categoria". */
function juntar(partes: readonly string[]) {
  const texto = partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}` : partes[0]
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
