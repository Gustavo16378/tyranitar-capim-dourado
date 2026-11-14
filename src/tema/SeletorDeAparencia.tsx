import { useId, useSyncExternalStore } from 'react'
import { cx } from '../componentes/cx'
import { aparencia, APARENCIAS } from './aparencia'

const ESTILOS = {
  // Sobre surface (Minha conta): como os Segmentos dos painéis, a opção escolhida em marrom.
  superficie: {
    grupo: 'bg-surface-sunken',
    opcao: 'text-ink-muted peer-checked:bg-marrom peer-checked:text-on-marrom peer-focus-visible:outline-focus-ring',
    legenda: 'text-label',
  },
  // Sobre terra (a barra lateral dos painéis): a escolhida clara, com o texto em terra.
  terra: {
    grupo: 'border border-[color-mix(in_srgb,var(--on-terra)_20%,transparent)]',
    opcao: 'text-on-terra peer-checked:bg-on-terra peer-checked:text-terra peer-focus-visible:outline-on-terra',
    legenda: 'text-caption font-semibold uppercase tracking-wider',
  },
} as const

/**
 * Aparência: Automático (segue o aparelho), Claro ou Escuro, salva neste aparelho. São rádios de
 * verdade (as setas do teclado trocam, o leitor de tela diz qual está marcada), com cara de segmentos.
 */
export function SeletorDeAparencia({
  sobre = 'superficie',
  legendaVisivel = true,
  className,
}: {
  sobre?: keyof typeof ESTILOS
  /** Sem ela visível, a legenda continua para o leitor de tela (quando um título já diz o nome). */
  legendaVisivel?: boolean
  className?: string
}) {
  const atual = useSyncExternalStore(aparencia.assinar, aparencia.estado, aparencia.estado)
  const nome = useId()
  const estilo = ESTILOS[sobre]
  return (
    <fieldset className={cx('m-0 flex min-w-0 flex-col gap-2 border-0 p-0', className)}>
      <legend className={cx('mb-2 p-0', legendaVisivel ? estilo.legenda : 'sr-only')}>Aparência</legend>
      <div className={cx('inline-flex max-w-full flex-wrap gap-1 self-start rounded-md p-1', estilo.grupo)}>
        {APARENCIAS.map((opcao) => (
          <label key={opcao.valor} className="relative">
            <input
              type="radio"
              name={nome}
              value={opcao.valor}
              checked={atual === opcao.valor}
              onChange={() => aparencia.escolher(opcao.valor)}
              className="peer sr-only"
            />
            <span
              className={cx(
                'inline-flex min-h-11 cursor-pointer items-center whitespace-nowrap rounded-pill px-3 text-label transition-colors duration-instante motion-reduce:transition-none',
                'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
                estilo.opcao,
              )}
            >
              {opcao.rotulo}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
