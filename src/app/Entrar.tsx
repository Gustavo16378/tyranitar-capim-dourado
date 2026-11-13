import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { comoErroApi, contasDeDemonstracao, entrar, entrarComDemo, useDados, useSessao, type ErroApi } from '../api'
import { Button, CapiMark, Icon } from '../componentes'
import { APP_NOME } from '../config'
import { useEntrada } from '../movimento'
import { sessaoDaLoja, sessaoDoShopping } from '../painel/api/sessoes'
import type { ContaDeDemonstracao, Perfil, Usuario } from '../tipos'
import { Campo } from './Campo'
import { destinoDoLogin, lerPedidoDeLogin } from './destinoDoLogin'

/** A frase do topo, pelo perfil que a tela de origem pediu. */
const CHAMADA: Record<Perfil, string> = {
  CLIENTE: 'Para reservar, ver sua carteira e conversar com a Capi.',
  LOJISTA: 'Entre com a conta da sua loja para abrir o painel da loja.',
  ADMIN_SHOPPING: 'Entre com a conta da administração para abrir o painel do shopping.',
}

function rotuloDaConta(conta: ContaDeDemonstracao) {
  if (conta.perfil === 'CLIENTE') return `Cliente (${conta.nome.split(' ')[0]})`
  if (conta.perfil === 'LOJISTA') return `Lojista (${conta.loja ?? conta.nome})`
  return 'Shopping (admin)'
}

/**
 * Entrar: o login único do app e dos dois painéis, com e-mail e senha ou, no modo
 * demonstração (DEMO=1 nas Functions), com uma das contas de teste. Depois de entrar, segue
 * pelo perfil do token (destinoDoLogin.ts): o cliente para o Início ou para a tela que pediu o
 * login, o lojista para /loja e a administração para /shopping.
 */
export default function Entrar() {
  const location = useLocation()
  const navegar = useNavigate()
  const pedido = lerPedidoDeLogin(location.state)
  const perfilPedido = pedido.perfil ?? 'CLIENTE'
  const sessoes = { CLIENTE: useSessao(), LOJISTA: sessaoDaLoja.useSessao(), ADMIN_SHOPPING: sessaoDoShopping.useSessao() }
  const contas = useDados(contasDeDemonstracao)
  const [enviando, setEnviando] = useState<'senha' | Perfil | null>(null)
  const [erro, setErro] = useState<ErroApi | null>(null)
  const tela = useEntrada<HTMLElement>()

  // Já tem a sessão do perfil que a tela de origem pede: segue direto para ela.
  if (enviando === null && sessoes[perfilPedido]?.usuario.perfil === perfilPedido) {
    return <Navigate to={destinoDoLogin(perfilPedido, pedido)} replace />
  }

  async function tentar(como: 'senha' | Perfil, acao: () => Promise<Usuario>) {
    setEnviando(como)
    setErro(null)
    try {
      const usuario = await acao()
      navegar(destinoDoLogin(usuario.perfil, pedido), { replace: true })
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

  const demonstracao = contas.tipo === 'ok' ? contas.dados : []

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
          <p className="mt-1 text-body-sm text-ink-muted">{CHAMADA[perfilPedido]}</p>
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

      {demonstracao.length > 0 && (
        <section aria-labelledby="titulo-demonstracao" className="flex flex-col gap-3">
          <p id="titulo-demonstracao" className="flex items-center gap-3 text-caption text-ink-muted">
            <span aria-hidden="true" className="h-px flex-1 bg-line" />
            ou entre com uma conta de demonstração
            <span aria-hidden="true" className="h-px flex-1 bg-line" />
          </p>
          {demonstracao.map((conta) => (
            <Button
              key={conta.perfil}
              block
              disabled={enviando !== null}
              onClick={() => tentar(conta.perfil, () => entrarComDemo(conta.perfil))}
            >
              {enviando === conta.perfil ? 'Entrando…' : rotuloDaConta(conta)}
            </Button>
          ))}
          <p className="text-center text-body-sm text-ink-muted">Contas de teste, sem senha.</p>
        </section>
      )}
    </main>
  )
}
