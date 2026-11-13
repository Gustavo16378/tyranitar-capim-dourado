import { useCallback, useState } from 'react'
import { Badge, Button, formatarPreco, MiniaturaProduto, type BadgeProps } from '../../../componentes'
import { cx } from '../../../componentes/cx'
import { useEntrada } from '../../../movimento'
import type { ProdutoDaLoja } from '../../../tipos/loja'
import { listarProdutos, useConsulta } from '../../api'
import { Campo } from '../../../painel/comum/Campo'
import { Carregando, Erro, Esqueleto, Vazio } from '../../../painel/comum/Estados'
import { Paginacao } from '../../../painel/comum/Paginacao'
import { useAdiado } from '../../../painel/comum/useAdiado'
import { resumoDosAtributos, rotuloDaCategoria } from './categorias'

const TAMANHO = 20

interface ListaDeProdutosProps {
  /** Frase do que acabou de acontecer ("Produto salvo: ..."), anunciada uma vez. */
  aviso: string
  aoEditar: (produto: ProdutoDaLoja) => void
}

/** O catálogo: busca pelo nome, os quatro estados e a paginação. */
export function ListaDeProdutos({ aviso, aoEditar }: ListaDeProdutosProps) {
  const [texto, setTexto] = useState('')
  const [pagina, setPagina] = useState(1)
  const q = useAdiado(texto.trim())
  const buscar = useCallback(
    (sinal: AbortSignal) => listarProdutos({ q: q || undefined, pagina, tamanho: TAMANHO }, sinal),
    [q, pagina],
  )
  const consulta = useConsulta(buscar)

  return (
    <div className="flex flex-col gap-4">
      <p role="status" className={cx('text-body-sm text-cerrado-ink', !aviso && 'sr-only')}>
        {aviso}
      </p>
      <Campo
        rotulo="Buscar no catálogo"
        type="search"
        placeholder="Nome do produto"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setPagina(1)
        }}
        className="max-w-[420px]"
      />

      {consulta.estado === 'carregando' && (
        <Carregando rotulo="Carregando o catálogo" className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Esqueleto key={i} className="h-[88px]" />
          ))}
        </Carregando>
      )}

      {consulta.estado === 'erro' && (
        <Erro erro={consulta.erro} aoTentarDeNovo={consulta.erro.passageiro ? consulta.recarregar : undefined} />
      )}

      {consulta.estado === 'pronto' &&
        (consulta.dados.itens.length === 0 ? (
          <Vazio ilustracao={q ? 'busca' : 'sacola'}>
            {q
              ? `Nenhum produto com "${q}" no nome.`
              : 'Nenhum produto ainda. Cadastre o primeiro ou importe uma planilha.'}
          </Vazio>
        ) : (
          <>
            <Produtos produtos={consulta.dados.itens} atualizando={consulta.atualizando} aoEditar={aoEditar} />
            <Paginacao pagina={pagina} tamanho={TAMANHO} total={consulta.dados.total} aoMudar={setPagina} />
          </>
        ))}
    </div>
  )
}

interface ProdutosProps {
  produtos: ProdutoDaLoja[]
  atualizando: boolean
  aoEditar: (produto: ProdutoDaLoja) => void
}

function Produtos({ produtos, atualizando, aoEditar }: ProdutosProps) {
  const ref = useEntrada<HTMLUListElement>()
  return (
    <ul
      ref={ref}
      aria-busy={atualizando}
      className={cx('flex flex-col gap-3 transition-opacity duration-rapida', atualizando && 'opacity-60')}
    >
      {produtos.map((produto) => (
        <li key={produto.id} data-anim>
          <LinhaProduto produto={produto} aoEditar={() => aoEditar(produto)} />
        </li>
      ))}
    </ul>
  )
}

/** Estoque em palavra (nunca só cor), com as mesmas regras do ProdutoCard do app. */
function seloDeEstoque({ estoque, ativo }: ProdutoDaLoja): { tom: BadgeProps['tone']; texto: string } {
  if (!ativo) return { tom: 'neutral', texto: 'Inativo' }
  if (estoque === 0) return { tom: 'perigo', texto: 'Esgotado' }
  if (estoque <= 2) return { tom: 'aviso', texto: `Últimas ${estoque}` }
  return { tom: 'neutral', texto: `${estoque} em estoque` }
}

function LinhaProduto({ produto, aoEditar }: { produto: ProdutoDaLoja; aoEditar: () => void }) {
  const selo = seloDeEstoque(produto)
  const detalhes = [rotuloDaCategoria(produto.categoria), resumoDosAtributos(produto.atributos)].filter(Boolean)
  return (
    <article
      className={cx(
        'flex flex-wrap items-center gap-4 rounded-md border border-line bg-surface-raised p-4',
        !produto.ativo && 'bg-surface',
      )}
    >
      <MiniaturaProduto foto={produto.fotos[0]} />
      <div className="flex min-w-[180px] flex-1 flex-col gap-0.5">
        <h3 className={cx('text-label', !produto.ativo && 'text-ink-muted')}>{produto.nome}</h3>
        <p className="text-body-sm text-ink-muted">{detalhes.join(' · ')}</p>
      </div>
      <div className="flex items-center gap-4">
        <span className="whitespace-nowrap text-price">{formatarPreco(produto.precoCentavos)}</span>
        <Badge tone={selo.tom}>{selo.texto}</Badge>
        <Button size="sm" onClick={aoEditar} aria-label={`Editar ${produto.nome}`}>
          Editar
        </Button>
      </div>
    </article>
  )
}
