import { Link } from 'react-router'
import { ProdutoCard } from '../componentes'
import type { ProdutoResumo } from '../tipos'
import { caminhoDaLoja, caminhoDoProduto } from './caminhos'
import { nomeDoPiso } from './formatos'
import { useSalvos } from './useSalvos'

export interface CartaoDoProdutoProps {
  produto: ProdutoResumo
  /** Deitado (o padrão), como nas listas do app; em pé, na grade da página da loja. */
  horizontal?: boolean
  /** Sem o link da loja (na própria página da loja, ou no grupo da loja nos salvos). */
  semLinkDaLoja?: boolean
  /** O botão do cartão, como "Reservar"; nomeDaAcao é o nome dele para o leitor de tela. */
  acao?: string
  nomeDaAcao?: string
  onAcao?: () => void
}

/**
 * O ProdutoCard das telas do app: o cartão abre o produto, o nome da loja abre a página da loja
 * e o coração salva (o mesmo estado em todas as telas, src/app/useSalvos.ts).
 */
export function CartaoDoProduto({
  produto,
  horizontal = true,
  semLinkDaLoja,
  acao,
  nomeDaAcao,
  onAcao,
}: CartaoDoProdutoProps) {
  const { salvo, alternar } = useSalvos()
  return (
    <ProdutoCard
      horizontal={horizontal}
      acao={acao}
      nomeDaAcao={nomeDaAcao}
      onAcao={onAcao}
      nome={produto.nome}
      loja={produto.loja.nome}
      piso={nomeDoPiso(produto.loja.piso)}
      precoCentavos={produto.precoCentavos}
      estoque={produto.estoque}
      foto={produto.foto ?? undefined}
      linkDoProduto={(nome, className) => (
        <Link to={caminhoDoProduto(produto.id)} className={className}>
          {nome}
        </Link>
      )}
      linkDaLoja={
        semLinkDaLoja
          ? undefined
          : (loja, className) => (
              <Link to={caminhoDaLoja(produto.loja.id)} className={className}>
                {loja}
              </Link>
            )
      }
      salvo={salvo(produto.id)}
      onSalvar={() => void alternar(produto)}
    />
  )
}
