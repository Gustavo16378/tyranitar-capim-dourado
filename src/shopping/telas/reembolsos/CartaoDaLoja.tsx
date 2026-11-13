import { useState } from 'react'
import { Badge, Button, formatarPreco } from '../../../componentes'
import { Erro } from '../../../painel/comum/Estados'
import { formatarData } from '../../../painel/comum/formatos'
import type { ReembolsoDoShopping, ReembolsosDaLoja } from '../../../tipos/shopping'
import { ErroApi, pagarReembolso, paraErroApi } from '../../api'

interface CartaoDaLojaProps {
  daLoja: ReembolsosDaLoja
  /** Pagou: a frase para anunciar. A lista busca de novo. */
  aoPagar: (mensagem: string) => void
}

/** O que pagar: um reembolso, ou todos os pendentes da loja. */
type Pagamento = { itens: ReembolsoDoShopping[]; centavos: number }

/** Os reembolsos de uma loja, com o total a receber e o pagamento (com confirmação). */
export function CartaoDaLoja({ daLoja, aoPagar }: CartaoDaLojaProps) {
  const { loja, pendenteCentavos, itens } = daLoja
  const pendentes = itens.filter((i) => i.status === 'PENDENTE')
  const [confirmando, setConfirmando] = useState<Pagamento | null>(null)
  const [pagando, setPagando] = useState(false)
  const [erro, setErro] = useState<ErroApi | null>(null)

  // Um PATCH por reembolso; se um falhar, para e mostra o erro (os anteriores ficam pagos).
  async function pagar({ itens: aPagar, centavos }: Pagamento) {
    setPagando(true)
    setErro(null)
    let pagos = 0
    try {
      for (const reembolso of aPagar) {
        await pagarReembolso(reembolso.id)
        pagos += 1
      }
      setConfirmando(null)
      aoPagar(
        aPagar.length === 1
          ? `Reembolso de ${formatarPreco(centavos)} da ${loja.nome} marcado como pago.`
          : `${aPagar.length} reembolsos da ${loja.nome} (${formatarPreco(centavos)}) marcados como pagos.`,
      )
    } catch (falha) {
      setErro(paraErroApi(falha))
      if (pagos) aoPagar(`${pagos} de ${aPagar.length} reembolsos da ${loja.nome} foram marcados como pagos.`)
    } finally {
      setPagando(false)
    }
  }

  return (
    <article className="flex flex-col gap-4 rounded-md border border-line bg-surface-raised p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-caption font-semibold uppercase tracking-wider text-ink-muted">{loja.unidade}</span>
          <h2 className="text-title-sm">{loja.nome}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {pendenteCentavos > 0 ? (
            <p className="text-right">
              <span className="block text-body-sm text-ink-muted">A receber</span>
              <strong className="text-price">{formatarPreco(pendenteCentavos)}</strong>
            </p>
          ) : (
            <Badge tone="cerrado" icon="check">
              Nada a receber
            </Badge>
          )}
          {pendentes.length > 1 && !confirmando && (
            <Button size="sm" onClick={() => setConfirmando({ itens: pendentes, centavos: pendenteCentavos })}>
              Pagar todos
            </Button>
          )}
        </div>
      </div>

      {confirmando && (
        <div role="group" aria-label="Confirmar pagamento" className="flex flex-col gap-3 rounded-md bg-surface-sunken p-4">
          <p className="text-body-sm">
            Marcar {confirmando.itens.length === 1 ? 'o reembolso' : `os ${confirmando.itens.length} reembolsos`} da{' '}
            {loja.nome} ({formatarPreco(confirmando.centavos)}) como pago? Faça isso depois de transferir: um reembolso
            pago não volta para pendente.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="confirm" icon="check" disabled={pagando} onClick={() => pagar(confirmando)}>
              {pagando ? 'Marcando…' : 'Confirmar pagamento'}
            </Button>
            <Button size="sm" variant="ghost" disabled={pagando} onClick={() => setConfirmando(null)}>
              Voltar
            </Button>
          </div>
        </div>
      )}
      {erro && <Erro erro={erro} />}

      <ul className="flex flex-col divide-y divide-line border-t border-line">
        {itens.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-body-sm">
            <span className="min-w-[180px] flex-1">
              {item.cupom.titulo}
              <span className="text-ink-muted"> · compra de {formatarData(item.criadoEm)}</span>
            </span>
            <span className="tabular-nums">{formatarPreco(item.centavos)}</span>
            {item.status === 'PAGO' ? (
              <Badge tone="cerrado" icon="check">
                Pago{item.pagoEm ? ` em ${formatarData(item.pagoEm)}` : ''}
              </Badge>
            ) : (
              <span className="flex items-center gap-2">
                <Badge icon="relogio">A pagar</Badge>
                {!confirmando && (
                  <Button size="sm" variant="ghost" onClick={() => setConfirmando({ itens: [item], centavos: item.centavos })}>
                    Marcar como pago
                  </Button>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
    </article>
  )
}
