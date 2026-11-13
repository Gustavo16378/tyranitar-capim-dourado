// POST /api/auth/cadastro (público): cria um cliente. Lojistas e admins nascem no painel do shopping.
import { abrirSessao } from '../../_lib/auth/sessao'
import { gerarHashSenha } from '../../_lib/auth/senha'
import type { Rota } from '../../_lib/contexto'
import { ErroApi } from '../../_lib/erros'
import { json, lerCorpo, texto } from '../../_lib/http'
import { buscarUsuarioPorEmail, criarCliente } from '../../_lib/repo/usuarios'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_EM_USO = 'Já existe uma conta com esse e-mail. Entre com ele ou use outro.'

function novoQrToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return `q-${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`
}

export const onRequestPost: Rota = async ({ request, env }) => {
  const corpo = await lerCorpo(request)
  const nome = texto(corpo, 'nome', { min: 2, max: 100 })
  const email = texto(corpo, 'email', { max: 200 }).toLowerCase()
  const senha = texto(corpo, 'senha', { min: 8, max: 200, aparar: false })
  if (!EMAIL.test(email)) throw new ErroApi('DADOS_INVALIDOS', 'Confira o e-mail: ele parece incompleto.')

  if (await buscarUsuarioPorEmail(env.DB, email)) throw new ErroApi('EMAIL_EM_USO', EMAIL_EM_USO)

  const cliente = { id: crypto.randomUUID(), nome, email, senhaHash: await gerarHashSenha(senha), qrToken: novoQrToken() }
  try {
    await criarCliente(env.DB, cliente)
  } catch (erro) {
    // Dois cadastros com o mesmo e-mail ao mesmo tempo: o UNIQUE do banco segura o segundo.
    if (String(erro).includes('UNIQUE')) throw new ErroApi('EMAIL_EM_USO', EMAIL_EM_USO)
    throw erro
  }

  return json(await abrirSessao({ id: cliente.id, nome, perfil: 'CLIENTE', loja_id: null }, env), 201)
}
