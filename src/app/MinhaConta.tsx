import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { comoErroApi, excluirConta, mudarConsentimento, obterConta, sair, useDados, type ErroApi } from '../api'
import { Button, formatarNumero, Icon, NivelBadge } from '../componentes'
import { cx } from '../componentes/cx'
import { APP_NOME } from '../config'
import { useEntrada } from '../movimento'
import type { Conta } from '../tipos'
import { Carregando, ErroTela, Esqueleto } from './Estados'
import { Folha } from './Folha'
import { paraNivel } from './formatos'

/** Interruptor de liga e desliga: o estado aparece também por escrito, não só pela cor. */
function Interruptor({
  ligado,
  ocupado,
  rotulo,
  onMudar,
}: {
  ligado: boolean
  ocupado: boolean
  rotulo: string
  onMudar: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      disabled={ocupado}
      onClick={onMudar}
      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border bg-surface p-4 text-left text-ink disabled:cursor-wait disabled:opacity-[.6]"
    >
      <span className="text-label">{rotulo}</span>
      <span className="flex flex-none items-center gap-2 text-body-sm text-ink-muted">
        {ligado ? 'Ligado' : 'Desligado'}
        <span
          aria-hidden="true"
          className={cx(
            'relative h-7 w-12 rounded-pill transition-colors duration-rapida motion-reduce:transition-none',
            ligado ? 'bg-marrom' : 'bg-line-strong',
          )}
        >
          <span
            className={cx(
              'absolute top-1 size-5 rounded-full bg-surface-raised shadow-card transition-[left] duration-rapida motion-reduce:transition-none',
              ligado ? 'left-6' : 'left-1',
            )}
          />
        </span>
      </span>
    </button>
  )
}

/**
 * Minha conta: nome, e-mail, nível, o consentimento da ficha (RF13, LGPD), sair e excluir a
 * conta. Aberta pelo avatar no topo do Início.
 */
export default function MinhaConta() {
  const navigate = useNavigate()
  const location = useLocation()
  const lida = useDados(obterConta, 'conta')
  // A resposta do consentimento atualiza a conta sem carregar a tela de novo.
  const [atualizada, setAtualizada] = useState<Conta | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<ErroApi | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erroAoExcluir, setErroAoExcluir] = useState<ErroApi | null>(null)
  const tela = useEntrada<HTMLDivElement>([lida.tipo])
  const conta = lida.tipo === 'ok' ? (atualizada ?? lida.dados) : null

  const voltar = () => (location.key === 'default' ? navigate('/inicio') : navigate(-1))

  async function alternarFicha(compartilhar: boolean) {
    setSalvando(true)
    setErro(null)
    setAviso(null)
    try {
      setAtualizada(await mudarConsentimento(compartilhar))
      setAviso(
        compartilhar
          ? 'Compartilhamento ligado. A Capi volta a anotar seus interesses nas próximas conversas.'
          : 'Compartilhamento desligado. Sua ficha foi apagada.',
      )
    } catch (falha) {
      setErro(comoErroApi(falha))
    } finally {
      setSalvando(false)
    }
  }

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

      <div ref={tela} className="flex flex-col gap-5">
        {lida.tipo === 'carregando' && (
          <Carregando className="flex flex-col gap-5">
            <Esqueleto className="h-[120px]" />
            <Esqueleto className="h-[180px]" />
          </Carregando>
        )}
        {lida.tipo === 'erro' && <ErroTela erro={lida.erro} onTentar={lida.recarregar} />}

        {conta && (
          <>
            <section
              data-anim
              aria-label="Seus dados"
              className="flex items-center gap-4 rounded-md border bg-surface-raised p-4"
            >
              <span
                aria-hidden="true"
                className="grid size-14 flex-none place-items-center rounded-full bg-terra text-title-md text-on-terra"
              >
                {conta.nome.trim().charAt(0).toUpperCase()}
              </span>
              <div className="flex min-w-0 flex-col items-start gap-1">
                <p className="text-title-sm">{conta.nome}</p>
                <p className="max-w-full truncate text-body-sm text-ink-muted">{conta.email}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <NivelBadge nivel={paraNivel(conta.nivel)} />
                  <span className="text-body-sm text-ink-muted">{formatarNumero(conta.pontos)} pontos</span>
                </div>
              </div>
            </section>

            <section data-anim aria-labelledby="titulo-ficha" className="flex flex-col gap-3">
              <h2 id="titulo-ficha" className="text-title-sm text-marrom-ink">
                Ficha de interesses
              </h2>
              <p className="text-body-sm text-ink-muted">
                A Capi anota o que você procura, como o número do tênis ou o perfume preferido, para as lojas te
                atenderem melhor. Cada loja vê só os interesses das categorias que ela vende, nunca a conversa. Desligar
                apaga a ficha na hora.
              </p>
              <Interruptor
                ligado={conta.compartilharFicha}
                ocupado={salvando}
                rotulo="Compartilhar minha ficha com as lojas"
                onMudar={() => alternarFicha(!conta.compartilharFicha)}
              />
              <p role="status" className="text-body-sm text-ink-muted empty:hidden">
                {aviso}
              </p>
              {erro && <ErroTela erro={erro} />}
            </section>

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
        {erroAoExcluir && (
          <p role="alert" className="flex items-start gap-2 text-body-sm text-perigo-ink">
            <Icon name="alerta" className="mt-px" />
            {erroAoExcluir.mensagem}
          </p>
        )}
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
