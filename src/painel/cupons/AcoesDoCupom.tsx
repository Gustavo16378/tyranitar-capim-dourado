import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '../../componentes'
import type { CupomComUso } from '../../tipos'
import { useAcao } from '../api/useAcao'
import { Erro } from '../comum/Estados'

interface AcoesDoCupomProps {
  cupom: CupomComUso
  /** "cupom" na loja, "voucher" no shopping: entra nos textos. */
  nome: 'cupom' | 'voucher'
  /** Abre o formulário da criação com o cupom, para editar. */
  aoEditar: () => void
  /** PUT { ativo }: editarCupom na loja, editarVoucher no shopping. */
  alternar: (id: string, edicao: { ativo: boolean }) => Promise<CupomComUso>
  /** DELETE: excluirCupom na loja, excluirVoucher no shopping. */
  excluir: (id: string) => Promise<void>
  /** O cupom voltou da API (desativado ou reativado): a lista troca o cartão. */
  aoMudar: (cupom: CupomComUso, aviso: string) => void
  /** O cupom foi excluído: a lista tira o cartão. */
  aoExcluir: (cupom: CupomComUso, aviso: string) => void
}

/**
 * Editar, Desativar ou Reativar e Excluir, embaixo de cada cupom. Excluir só aparece no cupom
 * nunca usado e sem reserva (o resto a API recusa) e pede confirmação, porque não volta atrás.
 * Desativar não apaga nada: o cupom some para os clientes e a reserva feita com ele mantém o desconto.
 */
export function AcoesDoCupom({ cupom, nome, aoEditar, alternar, excluir, aoMudar, aoExcluir }: AcoesDoCupomProps) {
  const idAviso = useId()
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const mudar = useAcao(alternar)
  const apagar = useAcao(excluir)
  const sim = useRef<HTMLButtonElement>(null)
  const botaoExcluir = useRef<HTMLButtonElement>(null)
  const voltouDaConfirmacao = useRef(false)
  const ocupado = mudar.enviando || apagar.enviando

  // Ao abrir a confirmação, o foco vai para "Sim, excluir"; ao voltar, para o "Excluir" de novo.
  useEffect(() => {
    if (confirmandoExclusao) sim.current?.focus()
    else if (voltouDaConfirmacao.current) {
      voltouDaConfirmacao.current = false
      botaoExcluir.current?.focus()
    }
  }, [confirmandoExclusao])

  async function alternarAtivo() {
    // O botão não fica desabilitado enquanto envia (o navegador tiraria o foco dele): o segundo toque é ignorado.
    if (ocupado) return
    const mudado = await mudar.executar(cupom.id, { ativo: !cupom.ativo })
    if (!mudado) return
    aoMudar(
      mudado,
      mudado.ativo
        ? `${nome === 'cupom' ? 'Cupom reativado' : 'Voucher reativado'}: ${mudado.titulo}. Ele volta a aparecer para os clientes.`
        : `${nome === 'cupom' ? 'Cupom desativado' : 'Voucher desativado'}: ${mudado.titulo}. Ele some para os clientes; as reservas feitas com ele mantêm o desconto.`,
    )
  }

  async function confirmarExclusao() {
    const resultado = await apagar.executar(cupom.id)
    // DELETE responde 204: executar devolve undefined no sucesso e null no erro.
    if (resultado === null) return
    aoExcluir(cupom, `${nome === 'cupom' ? 'Cupom excluído' : 'Voucher excluído'}: ${cupom.titulo}.`)
  }

  if (confirmandoExclusao) {
    return (
      <div role="group" aria-labelledby={idAviso} className="flex flex-col gap-3 rounded-md bg-surface-sunken p-3">
        <p id={idAviso} className="text-body-sm">
          Excluir o {nome} “{cupom.titulo}”? Não dá para desfazer.
        </p>
        {apagar.erro && <Erro erro={apagar.erro} />}
        <div className="flex flex-wrap gap-2">
          <Button ref={sim} size="sm" variant="danger" onClick={confirmarExclusao} disabled={apagar.enviando}>
            {apagar.enviando ? 'Excluindo…' : 'Sim, excluir'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={apagar.enviando}
            onClick={() => {
              voltouDaConfirmacao.current = true
              apagar.limpar()
              setConfirmandoExclusao(false)
            }}
          >
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" aria-label={`Editar ${cupom.titulo}`} onClick={aoEditar} disabled={ocupado}>
          Editar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label={`${cupom.ativo ? 'Desativar' : 'Reativar'} ${cupom.titulo}`}
          aria-busy={mudar.enviando}
          onClick={alternarAtivo}
          disabled={apagar.enviando}
        >
          {mudar.enviando ? (cupom.ativo ? 'Desativando…' : 'Reativando…') : cupom.ativo ? 'Desativar' : 'Reativar'}
        </Button>
        {!cupom.emUso && (
          <Button
            ref={botaoExcluir}
            size="sm"
            variant="ghost"
            aria-label={`Excluir ${cupom.titulo}`}
            onClick={() => setConfirmandoExclusao(true)}
            disabled={ocupado}
          >
            Excluir
          </Button>
        )}
      </div>
      {mudar.erro && <Erro erro={mudar.erro} />}
    </div>
  )
}
