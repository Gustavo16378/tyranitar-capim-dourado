import { Badge, formatarNumero } from '../../../componentes'
import { rotuloDaCategoria } from '../../../painel/comum/categorias'
import { formatarArea, rotuloDoPiso } from '../../../painel/comum/formatos'
import type { VagaComSugestao } from '../../../tipos/shopping'

interface CartaoVagaProps {
  vaga: VagaComSugestao
  /** "em 30 dias". */
  noPeriodo: string
}

/**
 * Uma vaga e o tipo de loja que o shopping deveria buscar para ela: a categoria, quantas
 * buscas ficaram sem resposta, os termos, por que ela cabe e o que mais caberia.
 * O id permite à planta levar até o cartão (#vaga-loja-47).
 */
export function CartaoVaga({ vaga, noPeriodo }: CartaoVagaProps) {
  const { sugestao } = vaga
  const onde = [vaga.unidade, rotuloDoPiso(vaga.piso), vaga.areaM2 ? formatarArea(vaga.areaM2) : null].filter(Boolean).join(' · ')

  return (
    <article
      id={`vaga-${vaga.mapaId}`}
      aria-label={`${vaga.unidade}${sugestao ? `: buscar ${rotuloDaCategoria(sugestao.categoria)}` : ''}`}
      className="flex h-full scroll-mt-6 flex-col gap-3 rounded-md border border-line bg-surface-raised p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-caption font-semibold uppercase tracking-wider text-ink-muted">{onde}</p>
        {sugestao && (
          <div className="flex flex-wrap gap-1">
            {sugestao.repetida && <Badge>2ª loja do tipo</Badge>}
            {sugestao.encaixe === 'IDEAL' ? (
              <Badge tone="cerrado" icon="check">
                Tamanho ideal
              </Badge>
            ) : (
              <Badge>Cabe</Badge>
            )}
          </div>
        )}
      </div>

      {sugestao ? (
        <>
          <div className="flex flex-col gap-1">
            <p className="text-body-sm text-ink-muted">Buscar uma loja de</p>
            <h3 className="text-title-md">{rotuloDaCategoria(sugestao.categoria)}</h3>
          </div>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <strong className="text-price">{formatarNumero(sugestao.buscas)}</strong>
            <span className="text-body-sm text-ink-muted">buscas sem resultado {noPeriodo}</span>
          </p>
          {sugestao.termos.length > 0 && (
            <ul aria-label="O que os clientes buscaram" className="flex flex-wrap gap-2">
              {sugestao.termos.map((t) => (
                <li key={t.termo} className="rounded-pill bg-surface-sunken px-3 py-1 text-caption text-ink">
                  {t.termo} <span className="tabular-nums text-ink-muted">· {formatarNumero(t.buscas)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-body-sm text-ink-muted">{sugestao.motivo}</p>
          {vaga.alternativas.length > 0 && (
            <p className="mt-auto border-t border-line pt-3 text-body-sm">
              <span className="text-ink-muted">Também cabe: </span>
              {vaga.alternativas.map((a) => rotuloDaCategoria(a.categoria)).join(', ')}
            </p>
          )}
        </>
      ) : (
        <p className="rounded-sm bg-surface-sunken p-3 text-body-sm text-ink-muted">
          Nenhuma categoria procurada {noPeriodo} cabe nesta unidade. Vale olhar de novo num período maior.
        </p>
      )}
    </article>
  )
}
