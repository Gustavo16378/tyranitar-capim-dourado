import { useId } from 'react'
import type { CupomDoCliente, OrigemCupom } from '../../../tipos/loja'
import { Opcao } from '../../../painel/comum/Opcao'
import {
  cuponsEscolhidos,
  cuponsQueValem,
  origensOcupadas,
  type EscolhaDeCupons,
  type ItemParaCupom,
} from './carrinho'

interface CuponsDaCompraProps {
  /** Todos os cupons que o cliente pode usar nesta loja (GET /api/loja/atendimento). */
  cupons: CupomDoCliente[]
  /** Os itens da compra, como a regra dos cupons vê. */
  itens: ItemParaCupom[]
  escolha: EscolhaDeCupons
  aoEscolher: (escolha: EscolhaDeCupons) => void
  /** Primeiro nome do cliente. */
  cliente: string
}

const LADOS: { origem: OrigemCupom; legenda: string; nenhum: string; ocupado: string }[] = [
  { origem: 'LOJA', legenda: 'Cupom da loja', nenhum: 'Sem cupom da loja', ocupado: 'um cupom da loja' },
  { origem: 'SHOPPING', legenda: 'Voucher do shopping', nenhum: 'Sem voucher', ocupado: 'um voucher do shopping' },
]

/**
 * Os cupons do cliente que valem nesta compra (RN05, RN15): um da loja e um voucher do shopping,
 * cada lado com a sua escolha. Só aparece o cupom que tem item em que descontar: o "10% em
 * calçados" some se não há calçado na compra, e nada vale no que já foi pago com Pix. Os que não
 * valem agora ficam escritos embaixo, com o motivo.
 */
export function CuponsDaCompra({ cupons, itens, escolha, aoEscolher, cliente }: CuponsDaCompraProps) {
  const nomeDoGrupo = useId()
  if (!cupons.length) return null

  if (!itens.length) {
    return (
      <p className="text-body-sm text-ink-muted">
        {cupons.length === 1 ? `${cliente} tem 1 cupom` : `${cliente} tem ${cupons.length} cupons`} para usar aqui. Eles
        aparecem quando a compra tem um item em que descontam.
      </p>
    )
  }

  const validos = cuponsQueValem(cupons, itens)
  const escolhidos = cuponsEscolhidos(escolha, validos)
  const ocupadas = origensOcupadas(itens)
  const foraDaCompra = cupons.filter((c) => !validos.includes(c))

  function porQueNaoVale(cupom: CupomDoCliente) {
    const lado = LADOS.find((l) => l.origem === cupom.origem)!
    if (ocupadas.has(cupom.origem)) return `${cupom.titulo} (a reserva já usa ${lado.ocupado})`
    if (cupom.origem === 'LOJA' && cupom.categoria) return `${cupom.titulo} (só em ${(cupom.paraQueVale ?? cupom.categoria).toLowerCase()})`
    return `${cupom.titulo} (nenhum item a pagar no caixa)`
  }

  return (
    <div className="flex flex-col gap-3">
      {LADOS.map(({ origem, legenda, nenhum }) => {
        const doLado = validos.filter((c) => c.origem === origem)
        if (!doLado.length) return null
        const marcado = escolhidos.find((id) => doLado.some((c) => c.id === id)) ?? null
        return (
          <fieldset key={origem} className="flex flex-col">
            <legend className="mb-1 text-label">{legenda}</legend>
            <Opcao
              tipo="radio"
              name={`${nomeDoGrupo}-${origem}`}
              checked={marcado === null}
              onChange={() => aoEscolher({ ...escolha, [origem]: null })}
            >
              {nenhum}
            </Opcao>
            {doLado.map((cupom) => (
              <Opcao
                key={cupom.id}
                tipo="radio"
                name={`${nomeDoGrupo}-${origem}`}
                checked={marcado === cupom.id}
                onChange={() => aoEscolher({ ...escolha, [origem]: cupom.id })}
              >
                {cupom.titulo}
                {origem === 'LOJA' && (
                  <span className="text-ink-muted">
                    {' '}
                    · {cupom.paraQueVale ? `só em ${cupom.paraQueVale.toLowerCase()}` : 'na compra toda'}
                  </span>
                )}
              </Opcao>
            ))}
          </fieldset>
        )
      })}
      {foraDaCompra.length > 0 && (
        <p className="text-body-sm text-ink-muted">Não valem nestes itens: {foraDaCompra.map(porQueNaoVale).join('; ')}.</p>
      )}
    </div>
  )
}
