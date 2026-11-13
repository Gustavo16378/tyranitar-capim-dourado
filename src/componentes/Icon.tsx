import { cx } from './cx'
import { CAMINHOS, type IconName } from './icones'

export interface IconProps {
  name: IconName
  className?: string
}

/**
 * Ícone de traço na cor do texto ao lado (currentColor). Tem 20 × 20 por padrão;
 * para outro tamanho, passe uma classe (size-4) ou ajuste pelo pai ([&>svg]:size-3.5).
 */
export function Icon({ name, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx('flex-none', className)}
    >
      {CAMINHOS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
