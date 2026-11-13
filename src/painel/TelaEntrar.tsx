import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { Button } from '../componentes'
import { APP_NOME } from '../config'
import { useEntrada } from '../movimento'
import { ErroApi } from './api/http'
import { useAcao } from './api/useAcao'
import { Campo } from './comum/Campo'
import { Erro } from './comum/Estados'
import { urlNoPainel, usePainel } from './painel'

/** Login de um painel (RF17 na loja). Depois de entrar, volta para a tela que pediu o login. */
export function TelaEntrar() {
  const painel = usePainel()
  const atual = painel.sessao.useSessao()
  const navegar = useNavigate()
  const inicial = urlNoPainel(painel, painel.telas[0].caminho)
  const voltarPara = (useLocation().state as { voltarPara?: string } | null)?.voltarPara ?? inicial
  const ref = useEntrada<HTMLDivElement>()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [semPermissao, setSemPermissao] = useState(false)
  const login = useAcao(painel.entrar)

  if (atual?.usuario.perfil === painel.perfil) return <Navigate to={voltarPara} replace />

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setSemPermissao(false)
    const resposta = await login.executar({ email: email.trim(), senha })
    if (!resposta) return
    // Conta de outro perfil (um cliente, um lojista no painel do shopping): não entra.
    if (resposta.usuario.perfil !== painel.perfil) {
      setSemPermissao(true)
      return
    }
    painel.sessao.gravarSessao(resposta)
    navegar(voltarPara, { replace: true })
  }

  const erro = semPermissao
    ? new ErroApi({
        status: 403,
        erro: 'SEM_PERMISSAO',
        mensagem: `Esta conta não tem acesso ao ${painel.nome.toLowerCase()}. Entre com outro e-mail.`,
      })
    : login.erro

  return (
    <main className="grid min-h-dvh place-items-center bg-surface px-4 py-8 text-ink">
      <title>{`Entrar · ${painel.nome} · ${APP_NOME}`}</title>
      <div ref={ref} className="flex w-full max-w-[400px] flex-col gap-6">
        <header data-anim className="flex flex-col gap-1">
          <p className="text-caption font-semibold uppercase tracking-wider text-marrom-ink">{APP_NOME}</p>
          <h1 className="text-title-lg">{painel.nome}</h1>
          <p className="text-body-sm text-ink-muted">{painel.chamadaDoLogin}</p>
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

        {painel.mocksLigados && (
          <p data-anim className="text-body-sm text-ink-muted">
            {painel.dicaComMocks}
          </p>
        )}
      </div>
    </main>
  )
}
