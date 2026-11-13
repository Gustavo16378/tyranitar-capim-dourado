import { useId, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { cadastrar, comoErroApi, useSessao, type ErroApi } from '../api'
import { Button, CapiMark, Icon } from '../componentes'
import { APP_NOME } from '../config'
import { useEntrada } from '../movimento'
import { Campo } from './Campo'

/**
 * Criar conta (RF01): nome, e-mail, senha e o consentimento da ficha (RF13, RN04), desmarcado por
 * padrão. A conta nova já entra logada e cai no Início, com 0 pontos, no nível Semente.
 */
export default function Cadastro() {
  const navigate = useNavigate()
  const sessao = useSessao()
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<ErroApi | null>(null)
  const tela = useEntrada<HTMLElement>()
  const idConsentimento = useId()

  // Quem já está logado não cria outra conta por aqui.
  if (sessao?.usuario.perfil === 'CLIENTE' && !enviando) return <Navigate to="/inicio" replace />

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    setEnviando(true)
    setErro(null)
    try {
      await cadastrar({
        nome: String(dados.get('nome') ?? '').trim(),
        email: String(dados.get('email') ?? '').trim(),
        senha: String(dados.get('senha') ?? ''),
        consentimentoFicha: dados.get('consentimento') === 'sim',
      })
      navigate('/inicio', { replace: true })
    } catch (falha) {
      setErro(comoErroApi(falha))
      setEnviando(false)
    }
  }

  return (
    <main ref={tela} className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-8">
      <title>{`Criar conta · ${APP_NOME}`}</title>
      <header data-anim className="flex flex-col items-start gap-4">
        <span className="grid size-14 place-items-center rounded-full bg-terra">
          <CapiMark className="size-9" />
        </span>
        <div>
          <p className="text-caption font-semibold uppercase tracking-widest text-marrom-ink">{APP_NOME}</p>
          <h1 className="mt-1 text-title-lg">Crie sua conta</h1>
          <p className="mt-1 text-body-sm text-ink-muted">Para reservar, juntar pontos e conversar com a Capi.</p>
        </div>
      </header>

      <form data-anim onSubmit={enviar} className="flex flex-col gap-4">
        <Campo rotulo="Nome" name="nome" autoComplete="name" minLength={2} maxLength={100} required />
        <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" inputMode="email" required />
        <div className="flex flex-col gap-1">
          <Campo rotulo="Senha" name="senha" type="password" autoComplete="new-password" minLength={8} required />
          <p className="text-caption text-ink-muted">Pelo menos 8 caracteres.</p>
        </div>

        {/* Consentimento da ficha (LGPD): desmarcado por padrão, e a conta funciona igual sem ele. */}
        <div className="flex items-start gap-3 rounded-md border border-line bg-surface-raised p-4">
          <input
            id={idConsentimento}
            type="checkbox"
            name="consentimento"
            value="sim"
            aria-describedby={`${idConsentimento}-detalhe`}
            className="mt-0.5 size-5 flex-none cursor-pointer accent-marrom"
          />
          <div className="flex flex-col gap-1">
            <label htmlFor={idConsentimento} className="cursor-pointer text-label">
              Pode guardar o que eu procuro na minha ficha
            </label>
            <p id={`${idConsentimento}-detalhe`} className="text-body-sm text-ink-muted">
              Opcional. Com a ficha, a loja onde você compra vê só o que tem a ver com ela, como número e cor
              preferida, para te atender melhor.
            </p>
          </div>
        </div>

        {erro && (
          <p role="alert" className="flex items-start gap-2 text-body-sm text-perigo-ink">
            <Icon name="alerta" className="mt-px" />
            {erro.mensagem}
          </p>
        )}
        <Button type="submit" variant="primary" block disabled={enviando}>
          {enviando ? 'Criando a conta…' : 'Criar conta'}
        </Button>
      </form>

      <p data-anim className="text-center text-body-sm text-ink-muted">
        Já tem conta?{' '}
        <Link to="/entrar" className="font-semibold text-marrom-ink underline">
          Entrar
        </Link>
      </p>
    </main>
  )
}
