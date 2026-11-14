import type { ReactNode } from 'react'
import { Badge } from './Badge'
import { Button } from './Button'
import { cx } from './cx'
import { formatarPreco } from './formatar'
import { Icon } from './Icon'

/**
 * Monta um link em volta do texto: a tela passa o <Link> do router, com a classe que o cartão
 * dá. Assim o design system não depende do router.
 */
export type LinkDoCartao = (texto: ReactNode, className: string) => ReactNode

// O link do produto cobre o cartão inteiro (o ::after esticado), e o anel de foco contorna o
// cartão. O que fica por cima dele (o coração, a loja e o botão) leva relative z-10.
const LINK_ESTICADO =
  "text-ink no-underline after:absolute after:inset-0 after:rounded-md after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus-ring"
const LINK_DA_LOJA = 'relative z-10 text-marrom-ink underline underline-offset-2'

export interface ProdutoCardProps {
  nome: string
  loja: string
  piso: string
  precoCentavos: number
  /** 0 mostra "Esgotado" e desliga a ação; 1 ou 2 mostra "Últimas N". */
  estoque?: number
  foto?: string
  /** Selo em ouro quando não há aviso de estoque, como "10% com cupom". */
  selo?: string
  /** Texto do botão de ação (primary). Sem ele, o cartão não tem botão. */
  acao?: string
  onAcao?: () => void
  /** O nome do botão para o leitor de tela, quando acao sozinho é vago numa lista: "Reservar Tênis Run". */
  nomeDaAcao?: string
  horizontal?: boolean
  /** O nome vira o link do produto, e o cartão inteiro abre o produto. */
  linkDoProduto?: LinkDoCartao
  /** O nome da loja vira um link (a página da loja). */
  linkDaLoja?: LinkDoCartao
  /** Com onSalvar, o coração aparece no canto; salvo o deixa cheio (aria-pressed). */
  salvo?: boolean
  onSalvar?: () => void
}

function FotoVazia() {
  return (
    <svg
      viewBox="0 0 120 90"
      width="60%"
      aria-hidden="true"
      fill="none"
      stroke="var(--line-strong)"
      strokeWidth={1.5}
    >
      <path d="M60 45m-8 0a8 8 0 1 0 16 0a16 16 0 1 0-32 0a24 24 0 1 0 48 0" strokeOpacity={0.7} />
    </svg>
  )
}

/** Ocupa a largura do pai (no design system, 248 px em pé e até 360 px deitado). */
export function ProdutoCard({
  nome,
  loja,
  piso,
  precoCentavos,
  estoque,
  foto,
  selo,
  acao,
  onAcao,
  nomeDaAcao,
  horizontal,
  linkDoProduto,
  linkDaLoja,
  salvo = false,
  onSalvar,
}: ProdutoCardProps) {
  const seloVisivel =
    estoque === 0 ? (
      <Badge tone="perigo">Esgotado</Badge>
    ) : estoque != null && estoque <= 2 ? (
      <Badge tone="aviso">Últimas {estoque}</Badge>
    ) : selo ? (
      <Badge tone="ouro">{selo}</Badge>
    ) : null

  return (
    <article
      className={cx(
        'relative flex w-full overflow-hidden rounded-md border border-line bg-surface-raised shadow-card',
        horizontal ? 'flex-row' : 'flex-col',
      )}
    >
      <div
        className={cx(
          'relative grid place-items-center overflow-hidden bg-surface-sunken',
          horizontal ? 'w-[104px] flex-none' : 'aspect-[4/3]',
        )}
      >
        {foto ? <img src={foto} alt="" className="size-full object-cover" /> : <FotoVazia />}
        {!horizontal && seloVisivel && <div className="absolute left-2 top-2">{seloVisivel}</div>}
      </div>
      <div
        className={cx(
          'flex flex-col gap-0.5 px-4 pb-4 pt-3',
          horizontal && 'min-w-0 flex-1',
          horizontal && onSalvar && 'pr-14',
        )}
      >
        <h3 className="text-label">{linkDoProduto ? linkDoProduto(nome, LINK_ESTICADO) : nome}</h3>
        <span className="flex items-center gap-1 text-body-sm text-ink-muted [&>svg]:size-3.5">
          <Icon name="pin" />
          <span>
            {linkDaLoja ? linkDaLoja(loja, LINK_DA_LOJA) : loja} · {piso}
          </span>
        </span>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="whitespace-nowrap text-price text-ink">{formatarPreco(precoCentavos)}</span>
          {acao && (
            <span className="relative z-10">
              <Button variant="primary" size="sm" disabled={estoque === 0} aria-label={nomeDaAcao} onClick={onAcao}>
                {acao}
              </Button>
            </span>
          )}
        </div>
      </div>
      {onSalvar && (
        // O nome fica fixo e aria-pressed diz se está salvo: "Salvar Tênis, pressionado".
        <button
          type="button"
          aria-pressed={salvo}
          aria-label={`Salvar ${nome}`}
          onClick={onSalvar}
          className="absolute right-1.5 top-1.5 z-10 grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-terra"
        >
          <span className="grid size-9 place-items-center rounded-full bg-surface-raised shadow-card">
            <Icon name="coracao" className={cx('size-5 transition-colors', salvo && 'fill-current')} />
          </span>
        </button>
      )}
    </article>
  )
}
