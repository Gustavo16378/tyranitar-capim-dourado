// Banco de mentira do painel do shopping: o administrador, as unidades da planta (21 lojas
// funcionando, com nomes genéricos por tipo, e as 13 vagas reais da planta, com número e
// área), os lojistas e as regras da fidelidade. Os vouchers e os reembolsos ficam em
// mocks/comum, divididos com o mock da loja. Fica na memória; os testes chamam reiniciarMocks().
import type { ConfiguracaoDoShopping, LojaDoShopping, LojistaDaLoja, Usuario } from '../../tipos/shopping'
import { reiniciarReembolsos } from '../comum/reembolsos'
import { reiniciarVouchers } from '../comum/vouchers'

export const EMAIL_DO_ADMIN = 'admin@demo.test'

export const ADMIN: Usuario = {
  id: 'usuario-admin',
  nome: 'Administração do shopping',
  perfil: 'ADMIN_SHOPPING',
  lojaId: null,
}

export interface LojaMock extends Omit<LojaDoShopping, 'lojistas'> {
  lojistas: LojistaDaLoja[]
}

function estadoInicial() {
  let cnpj = 0
  const funcionando = (
    id: string,
    nome: string,
    numero: string,
    piso: 1 | 2,
    areaM2: number,
    categorias: string[],
  ): LojaMock => {
    const mapaId = `loja-${numero.toLowerCase()}`
    cnpj += 1
    return {
      id,
      nome,
      unidade: `LOJA ${numero}`,
      piso,
      areaM2,
      tipo: categorias.includes('alimentacao') ? 'alimentacao' : 'loja',
      categorias,
      mapaId,
      cnpj: `11222333000${String(100 + cnpj)}`,
      ativa: true,
      lojistas: [{ id: `usuario-lojista-${id}`, nome: `Equipe da ${nome}`, email: `lojista.${mapaId}@demo.test` }],
    }
  }
  // As 13 lojas vagas da planta oficial, com o número e a área de cada unidade.
  const vaga = (numero: string, piso: 1 | 2, areaM2: number): LojaMock => ({
    id: `loja-${numero.toLowerCase()}`,
    nome: 'Vaga',
    unidade: `LOJA ${numero}`,
    piso,
    areaM2,
    tipo: piso === 2 ? 'alimentacao' : 'loja',
    categorias: [],
    mapaId: `loja-${numero.toLowerCase()}`,
    cnpj: null,
    ativa: false,
    lojistas: [],
  })

  const lojas: LojaMock[] = [
    funcionando('loja-esportes', 'Loja de esportes', '19', 1, 102, ['calcados', 'roupas', 'acessorios']),
    funcionando('loja-calcados', 'Calçados', '12', 1, 63.72, ['calcados']),
    funcionando('loja-perfumaria', 'Perfumaria', '58', 1, 44.07, ['perfumaria']),
    funcionando('loja-moda-masculina', 'Moda masculina', '18', 1, 122.33, ['roupas']),
    funcionando('loja-moda-feminina', 'Moda feminina', '13', 1, 212.48, ['roupas']),
    funcionando('loja-cosmeticos', 'Cosméticos', '33', 1, 90, ['perfumaria']),
    funcionando('loja-bolsas', 'Bolsas e malas', '08', 1, 96.7, ['acessorios']),
    funcionando('loja-moda-praia', 'Moda praia', '50', 1, 90.08, ['roupas']),
    funcionando('loja-calcados-femininos', 'Calçados femininos', '56', 1, 101.97, ['calcados']),
    funcionando('loja-farmacia', 'Farmácia', '35', 1, 59, ['perfumaria']),
    funcionando('loja-departamento', 'Loja de departamento', '32', 1, 499.33, ['roupas', 'calcados', 'acessorios']),
    funcionando('loja-moda-jovem', 'Moda jovem', '06', 1, 176.57, ['roupas']),
    funcionando('loja-acessorios', 'Acessórios femininos', '17', 1, 44, ['acessorios']),
    funcionando('loja-presentes', 'Presentes', '39', 1, 80, ['acessorios']),
    funcionando('loja-cinema', 'Cinema', '215', 2, 250.94, []),
    funcionando('loja-hamburgueria', 'Hamburgueria', '201', 2, 80.69, ['alimentacao']),
    funcionando('loja-pizzaria', 'Pizzaria', '202', 2, 65.41, ['alimentacao']),
    funcionando('loja-japonesa', 'Comida japonesa', '209', 2, 57.43, ['alimentacao']),
    funcionando('loja-cafeteria', 'Cafeteria', '204', 2, 38.11, ['alimentacao']),
    funcionando('loja-pastelaria', 'Pastelaria', '213', 2, 53.38, ['alimentacao']),
    funcionando('loja-restaurante', 'Restaurante por quilo', '200', 2, 286.07, ['alimentacao']),
    vaga('31', 1, 41.2),
    vaga('30', 1, 40.67),
    vaga('48A', 1, 35),
    vaga('48', 1, 35),
    vaga('47', 1, 229.9),
    vaga('141', 1, 311.55),
    vaga('142', 1, 35.96),
    vaga('143', 1, 116.1),
    vaga('131', 1, 54.99),
    vaga('133', 1, 62.13),
    vaga('132', 1, 60.4),
    vaga('203', 2, 58.81),
    vaga('205', 2, 35.51),
  ]
  // A Loja de esportes é a do lojista dos mocks da loja (lojista.loja-19@demo.test).
  lojas[0].lojistas = [{ id: 'usuario-lojista-esportes', nome: 'Equipe da Loja de esportes', email: 'lojista.loja-19@demo.test' }]

  const configuracao: ConfiguracaoDoShopping = {
    niveis: { SEMENTE: 0, BROTO: 500, CAPIM: 2000, DOURADO: 5000 },
    pontosPorReal: 1,
    prazoReservaHoras: { NA_LOJA: 4, PIX: 48 },
  }

  return { lojas, configuracao, proximoId: 100 }
}

export let banco = estadoInicial()

/** Volta os dados ao início (testes e "recomeçar a demonstração"), com vouchers e reembolsos. */
export function reiniciarMocks() {
  banco = estadoInicial()
  reiniciarVouchers()
  reiniciarReembolsos()
}

export function novoId(prefixo: string) {
  banco.proximoId += 1
  return `${prefixo}${banco.proximoId}`
}

/** O que a API devolve de uma loja: com a contagem de lojistas, não a lista. */
export function paraApi({ lojistas, ...loja }: LojaMock): LojaDoShopping {
  return { ...loja, lojistas: lojistas.length }
}
