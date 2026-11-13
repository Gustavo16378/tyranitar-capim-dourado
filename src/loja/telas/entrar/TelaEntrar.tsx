import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { Button } from '../../../componentes'
import { APP_NOME } from '../../../config'
import { useEntrada } from '../../../movimento'
import { entrar, ErroApi, MOCKS_LIGADOS, sessao, useAcao } from '../../api'
import { Campo } from '../../comum/Campo'
import { Erro } from '../../comum/Estados'
import { URL_INICIAL } from '../../enderecos'

const SO_LOJISTA = new ErroApi({
  status: 403,
  erro: 'SEM_PERMISSAO',
  mensagem: 'Esta conta não é de lojista. Entre com o e-mail da sua loja.',
})

/** Login do lojista (RF17). Depois de entrar, volta para a tela que pediu o login. */
export function TelaEntrar() {
  const atual = sessao.useSessao()
  const navegar = useNavigate()
  const voltarPara = (useLocation().state as { voltarPara?: string } | null)?.voltarPara ?? URL_INICIAL
  const ref = useEntrada<HTMLDivElement>()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [semPermissao, setSemPermissao] = useState(false)
  const login = useAcao(entrar)

  if (atual?.usuario.perfil === 'LOJISTA') return <Navigate to={voltarPara} replace />

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setSemPermissao(false)
    const resposta = await login.executar({ email: email.trim(), senha })
    if (!resposta) return
    if (resposta.usuario.perfil !== 'LOJISTA') {
      setSemPermissao(true)
      return
    }
    sessao.gravarSessao(resposta)
    navegar(voltarPara, { replace: true })
  }

  const erro = semPermissao ? SO_LOJISTA : login.erro

  return (
    <main className="grid min-h-dvh place-items-center bg-surface px-4 py-8 text-ink">
      <title>{`Entrar · Painel da loja · ${APP_NOME}`}</title>
      <div ref={ref} className="flex w-full max-w-[400px] flex-col gap-6">
        <header data-anim className="flex flex-col gap-1">
          <p className="text-caption font-semibold uppercase tracking-wider text-marrom-ink">{APP_NOME}</p>
          <h1 className="text-title-lg">Painel da loja</h1>
          <p className="text-body-sm text-ink-muted">Entre com o e-mail e a senha da sua loja.</p>
        </header>

        <form
          data-anim
          onSubmit={enviar}
          className="flex flex-col gap-4 rounded-md border border-line bg-surface-raised p-5 shadow-card"
        >
          <Campo
            rotulo="E-mail"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Campo
            rotulo="Senha"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          {erro && <Erro erro={erro} />}
          <Button type="submit" variant="primary" block disabled={login.enviando}>
            {login.enviando ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        {MOCKS_LIGADOS && (
          <p data-anim className="text-body-sm text-ink-muted">
            Com os dados de exemplo, entre com qualquer e-mail no formato{' '}
            <strong className="font-semibold text-ink">lojista.loja-19@demo.test</strong> e uma senha de 8
            caracteres ou mais.
          </p>
        )}
      </div>
    </main>
  )
}
