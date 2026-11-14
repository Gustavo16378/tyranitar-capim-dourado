import { Icon } from '../componentes'
import { cx } from '../componentes/cx'
import { useSalvos } from './useSalvos'

/**
 * O coração fora do cartão (na tela do produto), com o mesmo estado dos cartões. O nome fica fixo
 * e aria-pressed diz se está salvo, como no ProdutoCard.
 */
export function BotaoSalvar({ produto }: { produto: { id: string; nome: string } }) {
  const { salvo, alternar } = useSalvos()
  const ligado = salvo(produto.id)
  return (
    <button
      type="button"
      aria-pressed={ligado}
      aria-label={`Salvar ${produto.nome}`}
      onClick={() => void alternar(produto)}
      className="grid size-11 flex-none cursor-pointer place-items-center rounded-full border border-line bg-surface-raised text-terra"
    >
      <Icon name="coracao" className={cx('size-5 transition-colors', ligado && 'fill-current')} />
    </button>
  )
}
