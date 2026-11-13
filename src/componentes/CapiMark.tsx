export interface CapiMarkProps {
  /** Cor do traço. Padrão: ouro (sobre terra). */
  color?: string
  className?: string
}

/** A marca da Capi: o capim trançado em espiral. Ocupa a largura do pai; dê o tamanho por classe. */
export function CapiMark({ color = 'var(--ouro)', className }: CapiMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      className={className}
    >
      <path d="M16 16m-3 0a3 3 0 1 0 6 0a6 6 0 1 0-12 0a9 9 0 1 0 18 0" />
      <path d="M25 16a9 9 0 0 0-3-6.7" strokeOpacity={0.55} />
    </svg>
  )
}
