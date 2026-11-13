// GET e POST /api/auth/demo (públicos): as contas de demonstração, para a banca testar o app e
// os dois painéis sem cadastro. Só funcionam com DEMO=1 (wrangler.toml); desligadas, 404.
// São três usuários do seed, um por perfil: a cliente Ana, o lojista da loja da demonstração e a
// administração do shopping. Nenhum outro usuário entra por aqui, e cada um só com o perfil dele.
// O lojista é o da loja do primeiro produto do produtos.csv (a do roteiro): o seed grava o e-mail
// dele em configuracao (chave conta_demo_lojista); sem essa linha, vale o e-mail padrão abaixo.
//
//   GET  → { contas: [{ perfil, nome, loja }] }: as que estão no banco (a tela mostra um botão por conta)
//   POST { perfil } → o mesmo formato do login. Sem corpo, entra como a Ana (CLIENTE).
import type { Perfil } from '../../_lib/auth/jwt'
import { abrirSessao } from '../../_lib/auth/sessao'
import type { Rota } from '../../_lib/contexto'
import { ErroApi } from '../../_lib/erros'
import { json } from '../../_lib/http'
import { lerConfiguracao } from '../../_lib/repo/configuracao'
import { buscarLojaAtiva } from '../../_lib/repo/lojas'
import { buscarUsuarioPorEmail } from '../../_lib/repo/usuarios'

/** O e-mail padrão da conta de demonstração de cada perfil (scripts/gerar-seed.mjs). */
const CONTAS: Record<Perfil, string> = {
  CLIENTE: 'ana.souza@demo.test',
  LOJISTA: 'lojista.loja-pc01a@demo.test',
  ADMIN_SHOPPING: 'admin@demo.test',
}
const PERFIS = Object.keys(CONTAS) as Perfil[]

function exigirDemo(env: Env) {
  if (env.DEMO !== '1') throw new ErroApi('NAO_ENCONTRADO', 'As contas de demonstração estão desligadas.')
}

/** O e-mail da conta do perfil: o do lojista pode vir do seed (configuracao). */
async function emailDaConta(db: D1Database, perfil: Perfil) {
  if (perfil === 'LOJISTA') {
    const doSeed = await lerConfiguracao(db, 'conta_demo_lojista')
    if (typeof doSeed === 'string' && doSeed) return doSeed
  }
  return CONTAS[perfil]
}

/** O usuário da conta do perfil, se ele estiver no banco com esse perfil. */
async function contaDe(db: D1Database, perfil: Perfil) {
  const usuario = await buscarUsuarioPorEmail(db, await emailDaConta(db, perfil))
  return usuario?.perfil === perfil ? usuario : null
}

export const onRequestGet: Rota = async ({ env }) => {
  exigirDemo(env)
  const contas = []
  for (const perfil of PERFIS) {
    const usuario = await contaDe(env.DB, perfil)
    if (!usuario) continue
    const loja = usuario.loja_id ? await buscarLojaAtiva(env.DB, usuario.loja_id) : null
    if (perfil === 'LOJISTA' && !loja) continue // a loja da demonstração saiu: o botão não abriria nada
    contas.push({ perfil, nome: usuario.nome, loja: loja?.nome ?? null })
  }
  return json({ contas })
}

/** O perfil pedido no corpo; sem corpo, CLIENTE (como o botão antigo do app). */
async function perfilPedido(request: Request): Promise<Perfil> {
  const texto = (await request.text()).trim()
  if (!texto) return 'CLIENTE'
  let corpo: unknown
  try {
    corpo = JSON.parse(texto)
  } catch {
    throw new ErroApi('DADOS_INVALIDOS', 'Envie os dados em JSON.')
  }
  const perfil = corpo && typeof corpo === 'object' ? (corpo as Record<string, unknown>).perfil ?? 'CLIENTE' : undefined
  if (!PERFIS.includes(perfil as Perfil)) {
    throw new ErroApi('DADOS_INVALIDOS', `Use o perfil ${PERFIS.join(', ')}.`)
  }
  return perfil as Perfil
}

export const onRequestPost: Rota = async ({ request, env }) => {
  exigirDemo(env)
  const usuario = await contaDe(env.DB, await perfilPedido(request))
  if (!usuario) throw new ErroApi('NAO_ENCONTRADO', 'Essa conta de demonstração não está no banco.')
  return json(await abrirSessao(usuario, env))
}
