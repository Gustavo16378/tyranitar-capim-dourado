import { cx } from '../../componentes/cx'

interface SegmentosProps<T extends string> {
  /** Nome do grupo para o leitor de tela: "Filtrar reservas". */
  rotulo: string
  opcoes: readonly { valor: T; rotulo: string }[]
  valor: T
  aoMudar: (valor: T) => void
}

/**
 * Filtro de uma escolha só (status, período), como os pisos do mapa no protótipo: a opção
 * ativa em marrom. Fica numa linha acima do que ele filtra. Em tela estreita, as opções que não
 * cabem descem para a linha de baixo, em vez de a faixa rolar para o lado.
 */
export function Segmentos<T extends string>({ rotulo, opcoes, valor, aoMudar }: SegmentosProps<T>) {
  return (
    <div
      role="group"
      aria-label={rotulo}
      className="inline-flex max-w-full flex-wrap gap-1 rounded-md bg-surface-sunken p-1 lg:rounded-pill"
    >
      {opcoes.map((opcao) => {
        const ativo = opcao.valor === valor
        return (
          <button
            key={opcao.valor}
            type="button"
            aria-pressed={ativo}
            onClick={() => aoMudar(opcao.valor)}
            className={cx(
              'min-h-10 cursor-pointer whitespace-nowrap rounded-pill px-4 text-label transition-colors duration-instante',
              ativo ? 'bg-marrom text-on-marrom' : 'text-ink-muted hover:text-ink',
            )}
          >
            {opcao.rotulo}
          </button>
        )
      })}
    </div>
  )
}
