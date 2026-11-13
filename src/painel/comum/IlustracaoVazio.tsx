// As ilustrações dos estados vazios dos painéis: traço fino em tinta clara sobre um círculo
// ouro-suave, com a espiral da marca (CapiMark) em ouro em cada uma. Só tokens: funcionam no
// tema claro e no escuro. Decorativas: o texto do Vazio diz o que fazer.
import type { ReactNode } from 'react'

export type TemaDaIlustracao = 'sacola' | 'cupom' | 'grafico' | 'busca' | 'loja' | 'pessoas' | 'recibo'

/** A espiral da marca, com o centro em (x, y), em escala s (1 = 18 px de largura). */
function Espiral({ x, y, s = 0.5 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x - 16 * s} ${y - 16 * s}) scale(${s})`} fill="none" stroke="var(--ouro)" strokeWidth={2.2 / s}>
      <path d="M16 16m-3 0a3 3 0 1 0 6 0a6 6 0 1 0-12 0a9 9 0 1 0 18 0" />
    </g>
  )
}

const DESENHOS: Record<TemaDaIlustracao, ReactNode> = {
  // Sacola de compras: reservas, produtos, compras.
  sacola: (
    <>
      <path d="M38 40h44l4 38H34z" fill="var(--surface-raised)" />
      <path d="M49 40v-6a11 11 0 0 1 22 0v6" />
      <Espiral x={60} y={60} s={0.55} />
    </>
  ),
  // Canhoto de cupom, com o picote.
  cupom: (
    <>
      <path d="M28 36h64v9a5 5 0 0 0 0 10v9H28v-9a5 5 0 0 0 0-10z" fill="var(--surface-raised)" />
      <path d="M50 38v24" strokeDasharray="3 4" />
      <Espiral x={72} y={50} s={0.5} />
    </>
  ),
  // Barras vazias, tracejadas: ainda não há número para mostrar.
  grafico: (
    <>
      <path d="M30 76h60" />
      <path d="M38 76V62h10v14M55 76V50h10v26M72 76V40h10v36" strokeDasharray="3 3" />
      <Espiral x={84} y={26} s={0.42} />
    </>
  ),
  // Lupa: a busca não achou nada.
  busca: (
    <>
      <circle cx="54" cy="46" r="17" fill="var(--surface-raised)" />
      <path d="M66.5 58.5 80 72" strokeWidth={5} />
      <Espiral x={54} y={46} s={0.5} />
    </>
  ),
  // Fachada de loja com toldo: as unidades da planta.
  loja: (
    <>
      <path d="M36 44h48v32H36z" fill="var(--surface-raised)" />
      <path d="M32 44l6-14h44l6 14z" fill="var(--surface-raised)" />
      <path d="M54 76V58h12v18" />
      <Espiral x={72} y={56} s={0.36} />
    </>
  ),
  // Duas pessoas: quem tem acesso ao painel.
  pessoas: (
    <>
      <circle cx="50" cy="42" r="8" fill="var(--surface-raised)" />
      <path d="M36 72a14 14 0 0 1 28 0" />
      <circle cx="73" cy="46" r="6.5" fill="var(--surface-raised)" />
      <path d="M63 72a10.5 10.5 0 0 1 21 0" />
      <Espiral x={86} y={26} s={0.42} />
    </>
  ),
  // Recibo com a borda serrilhada: extrato e reembolsos.
  recibo: (
    <>
      <path d="M44 24h32v52l-5.3-4-5.4 4-5.3-4-5.3 4-5.4-4-5.3 4z" fill="var(--surface-raised)" />
      <path d="M51 36h18M51 44h18M51 52h10" />
      <Espiral x={86} y={30} s={0.42} />
    </>
  ),
}

export function IlustracaoVazio({ tema, className }: { tema: TemaDaIlustracao; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 96"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="var(--ink-muted)"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="60" cy="50" r="40" fill="var(--ouro-soft)" stroke="none" />
      {DESENHOS[tema]}
    </svg>
  )
}
