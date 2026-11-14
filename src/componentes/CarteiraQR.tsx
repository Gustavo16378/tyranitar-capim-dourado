import type { ReactNode } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { formatarNumero } from './formatar'
import type { NivelDoSelo } from './nivel'
import { NivelBadge } from './NivelBadge'

export interface CarteiraQRProps {
  nome: string
  nivel: NivelDoSelo
  pontos: number
  /** Conteúdo do QR: o qrToken do cliente, que o vendedor lê no balcão. */
  qrToken?: string
  /** Substitui o QR gerado, se precisar de outro conteúdo. */
  qr?: ReactNode
}

/** Textura da carteira: a espiral do capim dourado. */
function Trama() {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      stroke="var(--ouro)"
      aria-hidden="true"
      className="pointer-events-none absolute -right-[60px] -top-[60px] size-[200px] opacity-50"
    >
      {[24, 40, 56, 72, 88].map((r, i) => (
        <circle
          key={r}
          cx={100}
          cy={100}
          r={r}
          strokeWidth={i % 2 ? 1 : 2}
          strokeDasharray={i % 2 ? '3 5' : '18 6'}
        />
      ))}
    </svg>
  )
}

/** Ocupa a largura do pai (no design system, 340 px). */
export function CarteiraQR({ nome, nivel, pontos, qrToken, qr }: CarteiraQRProps) {
  return (
    <section
      aria-label="Carteira"
      className="relative flex w-full flex-col gap-4 overflow-hidden rounded-lg bg-terra p-6 text-on-terra"
    >
      <Trama />
      <div className="relative flex items-center justify-between">
        <div>
          <div className="text-body-sm opacity-[.85]">Olá,</div>
          <div className="text-title-md">{nome}</div>
        </div>
        <NivelBadge nivel={nivel} />
      </div>
      {/* O QR fica sempre sobre fundo claro, nos dois temas: on-terra é claro e terra é escuro em ambos. */}
      <div data-carteira-qr className="relative grid place-items-center rounded-md bg-on-terra p-4 text-terra">
        {qr ?? (
          <QRCodeSVG
            value={qrToken ?? nome}
            level="M"
            size={168}
            bgColor="transparent"
            fgColor="currentColor"
            title="QR code do cliente"
            role="img"
            aria-label="QR code do cliente"
          />
        )}
      </div>
      <div className="text-center text-body-sm opacity-[.85]">Mostre no caixa para usar cupons e somar pontos</div>
      <div className="relative flex items-baseline justify-between">
        <span>Seus pontos</span>
        <strong data-carteira-pontos className="text-metric">
          {formatarNumero(pontos)}
        </strong>
      </div>
    </section>
  )
}
