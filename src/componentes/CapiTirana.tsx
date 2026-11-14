export interface CapiTiranaProps {
  /** Cor do traço, dos chifres e dos olhos. Padrão: ouro (sobre terra). */
  color?: string
  /** A cor do fundo onde ela fica: contorna os olhos para eles se destacarem da espiral. */
  fundo?: string
  className?: string
}

/**
 * A Capi Tirana, do easter egg "O tirano da sexta-feira 13" (docs/easter-egg.md): a espiral da
 * CapiMark um pouco menor, com dois chifres e os olhos bravos. Desenho original, só com tokens.
 * Ocupa a largura do pai; dê o tamanho por classe.
 */
export function CapiTirana({ color = 'var(--ouro)', fundo = 'var(--terra)', className }: CapiTiranaProps) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" fill="none" className={className}>
      {/* Os chifres, curvos para fora. */}
      <path d="M9.4 12.6C7 9.8 6.3 6.4 7.2 2.8c1.7 3.2 3.9 5.4 6.6 6.6z" fill={color} />
      <path d="M22.6 12.6c2.4-2.8 3.1-6.2 2.2-9.8-1.7 3.2-3.9 5.4-6.6 6.6z" fill={color} />
      {/* A espiral da CapiMark, reduzida e descida para caber com os chifres. */}
      <g transform="translate(16 18.2) scale(0.82) translate(-16 -16)" stroke={color} strokeWidth={2.6} strokeLinecap="round">
        <path d="M16 16m-3 0a3 3 0 1 0 6 0a6 6 0 1 0-12 0a9 9 0 1 0 18 0" />
        <path d="M25 16a9 9 0 0 0-3-6.7" strokeOpacity={0.55} />
      </g>
      {/* Os olhos bravos: a ponta de dentro desce, como uma sobrancelha franzida. O contorno na
          cor do fundo separa os olhos da espiral. */}
      <g fill={color} stroke={fundo} strokeWidth={1.4} strokeLinejoin="round" paintOrder="stroke">
        <path d="M9.6 14.6l5.4 2.6-.3 2.6-4.6-1.1z" />
        <path d="M22.4 14.6L17 17.2l.3 2.6 4.6-1.1z" />
      </g>
    </svg>
  )
}
