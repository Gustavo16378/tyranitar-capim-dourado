import { useCallback, useState } from 'react'
import { Badge, Button } from '../../../componentes'
import { cx } from '../../../componentes/cx'
import { useEntrada } from '../../../movimento'
import { Campo } from '../../../painel/comum/Campo'
import { CapaDaCategoria } from '../../../painel/comum/CapaDaCategoria'
import { rotuloDaCategoria } from '../../../painel/comum/categorias'
import { Carregando, Erro, Esqueleto, Vazio } from '../../../painel/comum/Estados'
import { formatarArea, rotuloDoPiso } from '../../../painel/comum/formatos'
import { Paginacao } from '../../../painel/comum/Paginacao'
import { Segmentos } from '../../../painel/comum/Segmentos'
import { useAdiado } from '../../../painel/comum/useAdiado'
import type { LojaDoShopping } from '../../../tipos/shopping'
import { listarLojas, useConsulta } from '../../api'

type Situacao = 'TODAS' | 'ATIVA' | 'VAGA'

const SITUACOES: readonly { valor: Situacao; rotulo: string }[] = [
  { valor: 'TODAS', rotulo: 'Todas' },
  { valor: 'ATIVA', rotulo: 'Funcionando' },
  { valor: 'VAGA', rotulo: 'Vagas' },
]

const TAMANHO = 20

interface ListaDeLojasProps {
  aoEditar: (loja: LojaDoShopping) => void
}

/** As unidades com filtro de situação, busca pelo nome ou número e paginação. */
export function ListaDeLojas({ aoEditar }: ListaDeLojasProps) {
  const [situacao, setSituacao] = useState<Situacao>('TODAS')
  const [texto, setTexto] = useState('')
  const [pagina, setPagina] = useState(1)
  const q = useAdiado(texto.trim())
  const buscar = useCallback(
    (sinal: AbortSignal) =>
      listarLojas({ q: q || undefined, situacao: situacao === 'TODAS' ? undefined : situacao, pagina, tamanho: TAMANHO }, sinal),
    [q, situacao, pagina],
  )
  const consulta = useConsulta(buscar)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <Segmentos
          rotulo="Filtrar unidades"
          opcoes={SITUACOES}
          valor={situacao}
          aoMudar={(nova) => {
            setSituacao(nova)
            setPagina(1)
          }}
        />
        <Campo
          rotulo="Buscar"
          type="search"
          placeholder="Nome da loja ou número da unidade"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setPagina(1)
          }}
          className="min-w-[260px] flex-1 md:max-w-[380px]"
        />
      </div>

      {consulta.estado === 'carregando' && (
        <Carregando rotulo="Carregando as lojas" className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Esqueleto key={i} className="h-[76px]" />
          ))}
        </Carregando>
      )}
      {consulta.estado === 'erro' && (
        <Erro erro={consulta.erro} aoTentarDeNovo={consulta.erro.passageiro ? consulta.recarregar : undefined} />
      )}
      {consulta.estado === 'pronto' &&
        (consulta.dados.itens.length === 0 ? (
          <Vazio ilustracao={q ? 'busca' : 'loja'}>{q ? `Nenhuma unidade com "${q}".` : 'Nenhuma unidade nesta situação.'}</Vazio>
        ) : (
          <>
            <Unidades lojas={consulta.dados.itens} atualizando={consulta.atualizando} aoEditar={aoEditar} />
            <Paginacao pagina={pagina} tamanho={TAMANHO} total={consulta.dados.total} aoMudar={setPagina} />
          </>
        ))}
    </div>
  )
}

function Unidades({ lojas, atualizando, aoEditar }: { lojas: LojaDoShopping[]; atualizando: boolean } & Pick<ListaDeLojasProps, 'aoEditar'>) {
  const ref = useEntrada<HTMLUListElement>()
  return (
    <ul
      ref={ref}
      aria-busy={atualizando}
      className={cx('flex flex-col gap-2 transition-opacity duration-rapida', atualizando && 'opacity-60')}
    >
      {lojas.map((loja) => (
        <li key={loja.id} data-anim>
          <LinhaDaLoja loja={loja} aoEditar={() => aoEditar(loja)} />
        </li>
      ))}
    </ul>
  )
}

/** A capa da loja: a da primeira categoria dela; na praça de alimentação, a de alimentação. Vaga, nenhuma. */
function categoriaDaCapa(loja: LojaDoShopping) {
  if (!loja.ativa) return null
  return loja.categorias[0] ?? (loja.tipo === 'alimentacao' ? 'alimentacao' : null)
}

function LinhaDaLoja({ loja, aoEditar }: { loja: LojaDoShopping; aoEditar: () => void }) {
  const onde = [rotuloDoPiso(loja.piso), loja.areaM2 ? formatarArea(loja.areaM2) : null].filter(Boolean).join(' · ')
  return (
    <article
      className={cx(
        'flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border bg-surface-raised px-5 py-4',
        loja.ativa ? 'border-line' : 'border-dashed border-line-strong',
      )}
    >
      <div className="flex min-w-[220px] flex-1 items-center gap-4">
        <CapaDaCategoria categoria={categoriaDaCapa(loja)} className="h-12 w-[72px] flex-none rounded-sm" />
        <div className="flex flex-col gap-0.5">
          <span className="text-caption font-semibold uppercase tracking-wider text-ink-muted">{loja.unidade}</span>
          <h3 className={cx('text-label', !loja.ativa && 'text-ink-muted')}>{loja.ativa ? loja.nome : 'Unidade vaga'}</h3>
        </div>
      </div>
      <p className="min-w-[160px] text-body-sm text-ink-muted">
        {onde}
        {loja.categorias.length > 0 && (
          <>
            <br />
            {loja.categorias.map(rotuloDaCategoria).join(', ')}
          </>
        )}
      </p>
      <div className="flex items-center gap-3">
        {loja.ativa ? (
          <Badge>{loja.lojistas === 1 ? '1 lojista' : `${loja.lojistas} lojistas`}</Badge>
        ) : (
          <Badge>Vaga</Badge>
        )}
        <Button size="sm" onClick={aoEditar} aria-label={`${loja.ativa ? 'Editar' : 'Ocupar'} ${loja.unidade}`}>
          {loja.ativa ? 'Editar' : 'Ocupar vaga'}
        </Button>
      </div>
    </article>
  )
}
