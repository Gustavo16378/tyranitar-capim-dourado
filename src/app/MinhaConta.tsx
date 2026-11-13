import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { comoErroApi, excluirConta, mudarNome, obterConta, obterMeusDados, sair, useDados, type ErroApi } from '../api'
import { Button, formatarNumero, Icon, NivelBadge } from '../componentes'
import { APP_NOME } from '../config'
import { useEntrada } from '../movimento'
import type { Conta } from '../tipos'
import { salvarJson } from './arquivo'
import { Campo } from './Campo'
import { Carregando, ErroTela, Esqueleto } from './Estados'
import { FichaDaConta } from './FichaDaConta'
import { Folha } from './Folha'
import { FolhaSenha } from './FolhaSenha'
import { nomeDoArquivoDeDados, paraNivel } from './formatos'

/** Mensagem de erro de um bloco da tela, com o ícone de alerta. */
function Problema({ erro }: { erro: ErroApi | null }) {
  if (!erro) return null
  return (
    <p role="alert" className="flex items-start gap-2 text-body-sm text-perigo-ink">
      <Icon name="alerta" className="mt-px" />
      {erro.mensagem}
    </p>
  )
}

/** Nome, e-mail, nível e pontos, com o nome editável ali mesmo. */
function SeusDados({ conta, onContaAtualizada }: { conta: Conta; onContaAtualizada: (conta: Conta) => void }) {
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(conta.nome)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<ErroApi | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const botaoEditar = useRef<HTMLButtonElement>(null)
  // Fechado o formulário, o foco volta para onde estava: o botão de editar, que reaparece.
  const devolverFoco = useRef(false)
  useEffect(() => {
    if (!devolverFoco.current || editando) return
    devolverFoco.current = false
    botaoEditar.current?.focus()
  })

  function abrir() {
    setNome(conta.nome)
    setErro(null)
    setAviso(null)
    setEditando(true)
  }

  function fechar() {
    devolverFoco.current = true
    setEditando(false)
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      onContaAtualizada(await mudarNome(nome))
      setAviso('Nome atualizado.')
      fechar()
    } catch (falha) {
      setErro(comoErroApi(falha))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section data-anim aria-label="Seus dados" className="flex flex-col gap-3 rounded-md border bg-surface-raised p-4">
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-14 flex-none place-items-center rounded-full bg-terra text-title-md text-on-terra"
        >
          {conta.nome.trim().charAt(0).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-col items-start gap-1">
          <p className="max-w-full break-words text-title-sm">{conta.nome}</p>
          <p className="max-w-full truncate text-body-sm text-ink-muted">{conta.email}</p>
          <div className="flex flex-wrap items-center gap-2">
            <NivelBadge nivel={paraNivel(conta.nivel)} />
            <span className="text-body-sm text-ink-muted">{formatarNumero(conta.pontos)} pontos</span>
          </div>
        </div>
      </div>

      {editando ? (
        <form onSubmit={salvar} className="flex flex-col gap-3 border-t border-line pt-3">
          <Campo
            rotulo="Nome"
            autoComplete="name"
            autoFocus
            required
            minLength={2}
            maxLength={100}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <Problema erro={erro} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" size="sm" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar nome'}
            </Button>
            <Button size="sm" disabled={salvando} onClick={fechar}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button ref={botaoEditar} variant="ghost" size="sm" className="-ml-4 self-start" onClick={abrir}>
          Editar nome
        </Button>
      )}
      <p role="status" className="text-body-sm text-ink-muted empty:hidden">
        {aviso}
      </p>
    </section>
  )
}

/** Trocar a senha, numa folha que pede a atual. */
function Senha() {
  const [aberta, setAberta] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  return (
    <section data-anim aria-labelledby="titulo-senha" className="flex flex-col gap-3">
      <h2 id="titulo-senha" className="text-title-sm text-marrom-ink">
        Senha
      </h2>
      <p className="text-body-sm text-ink-muted">Para trocar, você confirma a senha atual.</p>
      <Button
        className="self-start"
        onClick={() => {
          setAviso(null)
          setAberta(true)
        }}
      >
        Trocar senha
      </Button>
      <p role="status" className="text-body-sm text-ink-muted empty:hidden">
        {aviso}
      </p>
      <FolhaSenha aberta={aberta} onFechar={() => setAberta(false)} onTrocou={() => setAviso('Senha trocada.')} />
    </section>
  )
}

/** LGPD: baixar tudo o que o app guarda sobre o cliente, num arquivo JSON. */
function CopiaDosDados() {
  const [baixando, setBaixando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<ErroApi | null>(null)

  async function baixar() {
    setBaixando(true)
    setAviso(null)
    setErro(null)
    try {
      const dados = await obterMeusDados()
      const nome = nomeDoArquivoDeDados(dados.geradoEm)
      salvarJson(nome, dados)
      setAviso(`Pronto: o arquivo ${nome} foi baixado.`)
    } catch (falha) {
      setErro(comoErroApi(falha))
    } finally {
      setBaixando(false)
    }
  }

  return (
    <section data-anim aria-labelledby="titulo-copia" className="flex flex-col gap-3">
      <h2 id="titulo-copia" className="text-title-sm text-marrom-ink">
        Cópia dos seus dados
      </h2>
      <p className="text-body-sm text-ink-muted">
        Pela LGPD, você pode baixar tudo o que o app guarda sobre você: conta, ficha, reservas, compras, favoritos,
        conversas com a Capi e buscas. O arquivo vem em JSON, um formato que outros serviços conseguem ler.
      </p>
      <Button className="self-start" disabled={baixando} onClick={baixar}>
        {baixando ? 'Preparando o arquivo…' : 'Baixar meus dados'}
      </Button>
      <p role="status" className="text-body-sm text-ink-muted empty:hidden">
        {aviso}
      </p>
      <Problema erro={erro} />
    </section>
  )
}

/**
 * Minha conta: nome (editável), e-mail, nível, a senha, a ficha que a Capi anotou com o
 * consentimento (RF13, LGPD), a cópia dos dados para baixar (LGPD), sair e excluir a conta.
 * Aberta pelo avatar no topo do Início.
 */
export default function MinhaConta() {
  const navigate = useNavigate()
  const location = useLocation()
  const lida = useDados(obterConta, 'conta')
  // O que a tela muda (nome, consentimento) atualiza a conta sem carregar a tela de novo.
  const [atualizada, setAtualizada] = useState<Conta | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erroAoExcluir, setErroAoExcluir] = useState<ErroApi | null>(null)
  const tela = useEntrada<HTMLDivElement>([lida.tipo])
  const conta = lida.tipo === 'ok' ? (atualizada ?? lida.dados) : null

  const voltar = () => (location.key === 'default' ? navigate('/inicio') : navigate(-1))

  async function excluir() {
    setExcluindo(true)
    setErroAoExcluir(null)
    try {
      // Excluída, a sessão acaba e o app volta sozinho para a tela de login.
      await excluirConta()
    } catch (falha) {
      setErroAoExcluir(comoErroApi(falha))
      setExcluindo(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col gap-5 px-4 py-6">
      <title>{`Minha conta · ${APP_NOME}`}</title>
      <button
        type="button"
        onClick={voltar}
        className="inline-flex cursor-pointer items-center gap-1 self-start border-0 bg-transparent py-1 text-label text-marrom-ink"
      >
        <Icon name="seta" className="size-4 -rotate-[135deg]" />
        Voltar
      </button>
      <h1 className="text-title-lg">Minha conta</h1>

      <div ref={tela} className="flex flex-col gap-7">
        {lida.tipo === 'carregando' && (
          <Carregando className="flex flex-col gap-5">
            <Esqueleto className="h-[120px]" />
            <Esqueleto className="h-[180px]" />
          </Carregando>
        )}
        {lida.tipo === 'erro' && <ErroTela erro={lida.erro} onTentar={lida.recarregar} />}

        {conta && (
          <>
            <SeusDados conta={conta} onContaAtualizada={setAtualizada} />
            <FichaDaConta conta={conta} onContaAtualizada={setAtualizada} />
            <Senha />
            <CopiaDosDados />

            <section data-anim aria-label="Sessão e conta" className="mt-auto flex flex-col gap-3 pt-4">
              <Button block onClick={sair}>
                Sair da conta
              </Button>
              <Button variant="danger" block onClick={() => setConfirmando(true)}>
                Excluir conta
              </Button>
            </section>
          </>
        )}
      </div>

      <Folha aberta={confirmando} onFechar={() => setConfirmando(false)} titulo="Excluir sua conta?">
        <p className="text-body-sm text-ink-muted">
          Seus dados saem do app: nome, e-mail, carteira, pontos, cupons, ficha, conversas e favoritos. As reservas em
          aberto são canceladas. Não dá para desfazer.
        </p>
        {erroAoExcluir && <Problema erro={erroAoExcluir} />}
        <div className="flex flex-col gap-2">
          <Button variant="danger" block disabled={excluindo} onClick={excluir}>
            {excluindo ? 'Excluindo…' : 'Excluir minha conta'}
          </Button>
          <Button block disabled={excluindo} onClick={() => setConfirmando(false)}>
            Cancelar
          </Button>
        </div>
      </Folha>
    </div>
  )
}
