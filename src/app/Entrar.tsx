import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { comoErroApi, entrar, entrarComDemo, useSessao, type ErroApi } from '../api'
import { Button, CapiMark, Icon } from '../componentes'
import { APP_NOME } from '../config'
import { useEntrada } from '../movimento'
import { Campo } from './Campo'

/** Para onde voltar depois de entrar: a tela que pediu o login, ou o Início. */
function destinoDe(estado: unknown) {
  const de = typeof estado === 'object' && estado !== null && 'de' in estado ? estado.de : null
  return typeof de === 'string' && de.startsWith('/') && !de.startsWith('/entrar') ? de : '/inicio'
}

/**
 * Entrar: login do cliente com e-mail e senha, ou com a conta de demonstração (a Ana), para a
 * banca testar sem cadastro. Com a sessão aberta, segue para a tela que pediu o login.
 */
export default function Entrar() {
  const location = useLocation()
  const sessao = useSessao()
  const [enviando, setEnviando] = useState<'senha' | 'demo' | null>(null)
  const [erro, setErro] = useState<ErroApi | null>(null)
  const tela = useEntrada<HTMLElement>()

  if (sessao?.usuario.perfil === 'CLIENTE') return <Navigate to={destinoDe(location.state)} replace />

  async function tentar(como: 'senha' | 'demo', acao: () => Promise<unknown>) {
    setEnviando(como)
    setErro(null)
    try {
      await acao()
      // A sessão nova redesenha a tela, que segue para o destino.
    } catch (falha) {
      setErro(comoErroApi(falha))
      setEnviando(null)
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    tentar('senha', () => entrar(String(dados.get('email') ?? ''), String(dados.get('senha') ?? '')))
  }

  return (
    <main ref={tela} className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-8">
      <title>{`Entrar · ${APP_NOME}`}</title>
      <header data-anim className="flex flex-col items-start gap-4">
        <span className="grid size-14 place-items-center rounded-full bg-terra">
          <CapiMark className="size-9" />
        </span>
        <div>
          <p className="text-caption font-semibold uppercase tracking-widest text-marrom-ink">{APP_NOME}</p>
          <h1 className="mt-1 text-title-lg">Entre na sua conta</h1>
          <p className="mt-1 text-body-sm text-ink-muted">Para reservar, ver sua carteira e conversar com a Capi.</p>
        </div>
      </header>

      <form data-anim onSubmit={enviar} className="flex flex-col gap-4">
        <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" inputMode="email" required />
        <Campo rotulo="Senha" name="senha" type="password" autoComplete="current-password" required />
        {erro && (
          <p role="alert" className="flex items-start gap-2 text-body-sm text-perigo-ink">
            <Icon name="alerta" className="mt-px" />
            {erro.mensagem}
          </p>
        )}
        <Button type="submit" variant="primary" block disabled={enviando !== null}>
          {enviando === 'senha' ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <div data-anim className="flex flex-col gap-3">
        <p className="flex items-center gap-3 text-caption text-ink-muted">
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
          ou
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
        </p>
        <Button block disabled={enviando !== null} onClick={() => tentar('demo', entrarComDemo)}>
          {enviando === 'demo' ? 'Entrando…' : 'Entrar com a conta de demonstração'}
        </Button>
        <p className="text-center text-body-sm text-ink-muted">Você entra como Ana, cliente de teste.</p>
      </div>
    </main>
  )
}
