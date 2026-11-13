import { useEffect, useRef, useState } from 'react'
import { apagarInteresse, comoErroApi, mudarConsentimento, obterFicha, useDados, type ErroApi } from '../api'
import { Button, Icon } from '../componentes'
import { cx } from '../componentes/cx'
import { rotuloDaCategoria } from '../painel/comum/categorias'
import type { Conta, FichaDoCliente } from '../tipos'
import { Carregando, ErroTela, Esqueleto, Vazio } from './Estados'

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
 * Ficha de interesses na Minha conta: o consentimento (RF13) e o que a Capi anotou, cada
 * interesse com o botão de apagar. É o que as lojas veem no atendimento (RN04).
 */
export function FichaDaConta({ conta, onContaAtualizada }: { conta: Conta; onContaAtualizada: (conta: Conta) => void }) {
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<ErroApi | null>(null)
  // Ligar ou desligar muda a ficha: a chave nova faz o useDados buscar de novo.
  const chave = `ficha-${conta.compartilharFicha}`
  const lida = useDados(obterFicha, chave)
  // Depois de apagar, a ficha que a API devolveu vale até a próxima leitura.
  const [depois, setDepois] = useState<{ chave: string; ficha: FichaDoCliente } | null>(null)
  const [apagando, setApagando] = useState<string | null>(null)
  const ficha = depois?.chave === chave ? depois.ficha : lida.tipo === 'ok' ? lida.dados : null

  // O botão apagado some: o foco vai para o interesse que ficou no lugar, ou para o título.
  const lista = useRef<HTMLUListElement>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  const focoPendente = useRef<number | null>(null)
  useEffect(() => {
    const posicao = focoPendente.current
    if (posicao === null) return
    focoPendente.current = null
    const botoes = lista.current?.querySelectorAll('button')
    const alvo = botoes?.length ? botoes[Math.min(posicao, botoes.length - 1)] : titulo.current
    alvo?.focus()
  })

  async function alternar(compartilhar: boolean) {
    setSalvando(true)
    setErro(null)
    setAviso(null)
    try {
      onContaAtualizada(await mudarConsentimento(compartilhar))
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

  async function apagar(id: string, detalhe: string, posicao: number) {
    setApagando(id)
    setErro(null)
    setAviso(null)
    try {
      setDepois({ chave, ficha: await apagarInteresse(id) })
      setAviso(`Apagado da ficha: ${detalhe}. As lojas não veem mais.`)
      focoPendente.current = posicao
    } catch (falha) {
      const problema = comoErroApi(falha)
      setErro(problema)
      // Já não estava na ficha (apagado em outra aba): mostra a ficha como está agora.
      if (problema.status === 404) lida.recarregar()
    } finally {
      setApagando(null)
    }
  }

  return (
    <section data-anim aria-labelledby="titulo-ficha" className="flex flex-col gap-3">
      <h2 id="titulo-ficha" className="text-title-sm text-marrom-ink">
        Ficha de interesses
      </h2>
      <p className="text-body-sm text-ink-muted">
        A Capi anota o que você procura, como o número do tênis ou o perfume preferido, para as lojas te atenderem
        melhor. Cada loja vê só os interesses das categorias que ela vende, nunca a conversa. Desligar apaga a ficha na
        hora.
      </p>
      <Interruptor
        ligado={conta.compartilharFicha}
        ocupado={salvando}
        rotulo="Compartilhar minha ficha com as lojas"
        onMudar={() => alternar(!conta.compartilharFicha)}
      />

      <h3 ref={titulo} tabIndex={-1} className="mt-2 text-label">
        O que a Capi anotou
      </h3>
      {lida.tipo === 'carregando' && !ficha && (
        <Carregando className="flex flex-col gap-2">
          <Esqueleto className="h-[60px]" />
          <Esqueleto className="h-[60px]" />
        </Carregando>
      )}
      {lida.tipo === 'erro' && !ficha && <ErroTela erro={lida.erro} onTentar={lida.recarregar} />}
      {ficha &&
        (!ficha.compartilharFicha ? (
          <Vazio>Com o compartilhamento desligado, a Capi não anota nada.</Vazio>
        ) : ficha.interesses.length === 0 ? (
          <Vazio>A Capi ainda não anotou nada. Conte para ela o que você procura.</Vazio>
        ) : (
          <ul ref={lista} aria-label="Interesses anotados" className="flex flex-col gap-2">
            {ficha.interesses.map((interesse, posicao) => (
              <li
                key={interesse.id}
                className="flex items-center justify-between gap-3 rounded-md border bg-surface-raised py-2 pl-4 pr-2"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-caption text-ink-muted">{rotuloDaCategoria(interesse.categoria)}</span>
                  <span className="text-body-sm">{interesse.detalhe}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-none"
                  disabled={apagando !== null}
                  aria-label={`Apagar da ficha: ${interesse.detalhe}`}
                  onClick={() => apagar(interesse.id, interesse.detalhe, posicao)}
                >
                  {apagando === interesse.id ? 'Apagando…' : 'Apagar'}
                </Button>
              </li>
            ))}
          </ul>
        ))}

      <p role="status" className="text-body-sm text-ink-muted empty:hidden">
        {aviso}
      </p>
      {erro && (
        <p role="alert" className="flex items-start gap-2 text-body-sm text-perigo-ink">
          <Icon name="alerta" className="mt-px" />
          {erro.mensagem}
        </p>
      )}
    </section>
  )
}
