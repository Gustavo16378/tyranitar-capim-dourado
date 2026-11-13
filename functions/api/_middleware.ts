// Roda antes de toda rota /api: transforma erros em { status, erro, mensagem }, lê o JWT
// e exige o perfil certo para cada área. As rotas soltas (POST /api/reservas, por exemplo)
// conferem o perfil com exigirPerfil.
import type { Perfil } from '../_lib/auth/jwt'
import { lerToken } from '../_lib/auth/jwt'
import { exigirPerfil, type Rota } from '../_lib/contexto'
import { ErroApi, respostaDeErro } from '../_lib/erros'

const tratarErros: Rota = async (context) => {
  try {
    return await context.next()
  } catch (erro) {
    if (erro instanceof ErroApi) return respostaDeErro(erro)
    console.error(`Erro em ${context.request.method} ${new URL(context.request.url).pathname}:`, erro)
    return respostaDeErro(new ErroApi('ERRO_INTERNO', 'Algo deu errado do nosso lado. Tente de novo em instantes.'))
  }
}

// Áreas inteiras com perfil fixo: uma rota nova dentro delas já nasce protegida.
const AREAS: [prefixo: string, perfil: Perfil][] = [
  ['/api/me/', 'CLIENTE'],
  ['/api/loja/', 'LOJISTA'],
  ['/api/shopping/', 'ADMIN_SHOPPING'],
]

const autenticar: Rota = async (context) => {
  const cabecalho = context.request.headers.get('Authorization')
  if (cabecalho) {
    const [tipo, token, ...sobra] = cabecalho.trim().split(/\s+/)
    if (tipo !== 'Bearer' || !token || sobra.length) {
      throw new ErroApi('NAO_AUTENTICADO', 'Envie o token no formato "Authorization: Bearer <token>".')
    }
    context.data.usuario = await lerToken(token, context.env.JWT_SECRET)
  }
  const caminho = new URL(context.request.url).pathname
  const area = AREAS.find(([prefixo]) => caminho.startsWith(prefixo))
  if (area) exigirPerfil(context.data, area[1])
  return context.next()
}

export const onRequest = [tratarErros, autenticar]
