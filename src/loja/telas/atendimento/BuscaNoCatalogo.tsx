import { useCallback, useState } from 'react'
import { Button, formatarPreco, MiniaturaProduto } from '../../../componentes'
import { cx } from '../../../componentes/cx'
import type { Lista, ProdutoDaLoja } from '../../../tipos/loja'
import { listarProdutos, useConsulta, type Consulta } from '../../api'
import { Campo } from '../../../painel/comum/Campo'
import { rotuloDaCategoria } from '../../../painel/comum/categorias'
import { Erro, Vazio } from '../../../painel/comum/Estados'
import { useAdiado } from '../../../painel/comum/useAdiado'

/** A busca começa com 2 letras; antes disso, todo produto da loja apareceria. */
const MINIMO = 2
/** Quantos produtos aparecem: o caixa refina a busca se o certo não está entre eles. */
const RESULTADOS = 5

/**
 * Produto do catálogo da loja que não foi reservado (GET /api/loja/produtos?q=): o caixa busca
 * pelo nome e põe na compra. Só os ativos, porque a API não registra compra de produto inativo.
 */
export function BuscaNoCatalogo({ aoEscolher }: { aoEscolher: (produto: ProdutoDaLoja) => void }) {
  const [texto, setTexto] = useState('')
  const termo = useAdiado(texto.trim())
  const buscar = useCallback(
    (sinal: AbortSignal) => (termo.length >= MINIMO ? listarProdutos({ q: termo, tamanho: 20 }, sinal) : Promise.resolve(null)),
    [termo],
  )
  const consulta = useConsulta(buscar)
  const buscando = texto.trim().length >= MINIMO

  return (
    <div role="search" aria-label="Catálogo da loja" className="flex flex-col gap-2">
      <Campo
        rotulo="Buscar no catálogo da loja"
        type="search"
        autoComplete="off"
        placeholder="Nome do produto"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        dica="Para pôr na compra um produto que não foi reservado."
      />
      {buscando && <Resultados consulta={consulta} termo={termo} aoEscolher={aoEscolher} />}
    </div>
  )
}

interface ResultadosProps {
  consulta: Consulta<Lista<ProdutoDaLoja> | null>
  termo: string
  aoEscolher: (produto: ProdutoDaLoja) => void
}

function Resultados({ consulta, termo, aoEscolher }: ResultadosProps) {
  if (consulta.estado === 'carregando' || (consulta.estado === 'pronto' && !consulta.dados)) {
    return (
      <p role="status" className="text-body-sm text-ink-muted">
        Buscando no catálogo…
      </p>
    )
  }
  if (consulta.estado === 'erro') {
    const { erro, recarregar } = consulta
    return <Erro erro={erro} aoTentarDeNovo={erro.passageiro ? recarregar : undefined} />
  }
  const ativos = (consulta.dados?.itens ?? []).filter((p) => p.ativo).slice(0, RESULTADOS)
  if (!ativos.length) {
    return (
      <Vazio ilustracao="busca" compacto>
        Nenhum produto ativo com “{termo}” no catálogo. Confira o nome ou use Outros.
      </Vazio>
    )
  }
  return (
    <ul
      aria-label="Produtos encontrados"
      aria-busy={consulta.atualizando}
      className={cx('flex flex-col gap-2 transition-opacity duration-rapida', consulta.atualizando && 'opacity-60')}
    >
      {ativos.map((produto) => (
        <li key={produto.id} className="flex items-center gap-3 rounded-sm border border-line px-3 py-2">
          <MiniaturaProduto foto={produto.fotos[0] ?? null} className="size-11" />
          <div className="min-w-0 flex-1">
            <p className="text-label">{produto.nome}</p>
            <p className="text-body-sm text-ink-muted">
              {rotuloDaCategoria(produto.categoria)} · {formatarPreco(produto.precoCentavos)}
              {produto.estoque === 0 && ' · sem estoque no sistema'}
            </p>
          </div>
          <Button size="sm" icon="mais" aria-label={`Adicionar ${produto.nome}`} onClick={() => aoEscolher(produto)}>
            Adicionar
          </Button>
        </li>
      ))}
    </ul>
  )
}
