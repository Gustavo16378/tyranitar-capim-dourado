// Página de conferência do design system (/design-system). Só existe em desenvolvimento:
// o App só registra a rota com import.meta.env.DEV, e ela fica fora do build.
import { useRef, useState, type ReactNode } from 'react'
import { APP_NOME } from '../config'
import {
  Badge,
  BottomNav,
  Button,
  CapiMark,
  CarteiraQR,
  ChatBubble,
  ChatComposer,
  CupomTicket,
  FichaCliente,
  Icon,
  NivelBadge,
  ProdutoCard,
  ProgressoNivel,
  ReservaStatus,
  StatTile,
  type AbaId,
  type IconName,
} from '../componentes'
import { CAMINHOS } from '../componentes/icones'
import { desenharTranca, somarPontos, subirDeNivel, useEntrada, useGSAP } from '../movimento'
import tokens from './tokens.json'

type Tema = 'light' | 'dark'

const ICONES = Object.keys(CAMINHOS) as IconName[]

// Classes escritas por inteiro para o Tailwind encontrar.
const CLASSE_DO_ESTILO: Record<string, string> = {
  display: 'text-display',
  'title-lg': 'text-title-lg',
  'title-md': 'text-title-md',
  'title-sm': 'text-title-sm',
  body: 'text-body',
  'body-sm': 'text-body-sm',
  label: 'text-label',
  caption: 'text-caption',
  price: 'text-price',
  metric: 'text-metric',
}

export default function PaginaDesignSystem() {
  return (
    <div className="min-h-dvh bg-surface text-ink">
      <header className="mx-auto flex max-w-[1240px] flex-col gap-2 px-4 pb-6 pt-8">
        <p className="text-caption font-semibold uppercase tracking-widest text-marrom-ink">
          Design system · só em desenvolvimento
        </p>
        <h1 className="text-display">{APP_NOME}</h1>
        <p className="max-w-[64ch] text-ink-muted">
          Os componentes de <code>src/componentes</code> com os tokens de{' '}
          <code>src/design-system/tokens.json</code>, nos temas claro e escuro lado a lado.
        </p>
      </header>
      <main className="mx-auto flex max-w-[1240px] flex-col gap-8 px-4 pb-12">
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <Vitrine tema="light" />
          <Vitrine tema="dark" />
        </div>
        <Movimentos />
      </main>
    </div>
  )
}

function Vitrine({ tema }: { tema: Tema }) {
  const nome = tokens.color.themes.find((t) => t.id === tema)?.name ?? tema
  return (
    <section
      data-theme={tema}
      aria-label={`Tema ${nome}`}
      className="flex min-w-0 flex-col gap-8 rounded-lg border border-line bg-surface p-6 text-ink"
    >
      <h2 className="text-title-lg">Tema {nome}</h2>

      <Bloco titulo="Cores" nota="Os mesmos nomes nos dois temas.">
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
          {tokens.color.tokens.map((t) => (
            <div key={t.name} className="flex min-w-0 items-center gap-2">
              <span
                className="size-8 flex-none rounded-sm border border-line"
                style={{ background: `var(--${t.name})` }}
              />
              <code className="truncate text-caption">{t.name}</code>
            </div>
          ))}
        </div>
      </Bloco>

      <Bloco titulo="Tipografia" nota="Fraunces nos títulos, Figtree na interface.">
        <div className="flex w-full flex-col gap-2">
          {tokens.type.groups
            .flatMap((g) => g.styles)
            .map((e) => (
              <div key={e.name} className="flex items-baseline gap-3">
                <code className="w-16 flex-none text-caption text-ink-muted">{e.name}</code>
                <span className={CLASSE_DO_ESTILO[e.name]}>{e.sample}</span>
              </div>
            ))}
        </div>
      </Bloco>

      <Bloco titulo="Icon" nota="Traço de 1,75 na cor do texto.">
        {ICONES.map((nome) => (
          <span key={nome} className="flex w-16 flex-col items-center gap-1 text-caption text-ink-muted">
            <Icon name={nome} className="text-ink" />
            {nome}
          </span>
        ))}
      </Bloco>

      <Bloco titulo="CapiMark" nota="A espiral trançada, em ouro sobre terra.">
        <span className="grid size-8 place-items-center rounded-full bg-terra">
          <CapiMark className="size-[22px]" />
        </span>
        <span className="grid size-16 place-items-center rounded-full bg-terra">
          <CapiMark className="size-11" />
        </span>
      </Bloco>

      <Bloco titulo="Button" nota="primary é a ação principal: no máximo um por tela.">
        <Button variant="primary">Reservar com Pix</Button>
        <Button variant="secondary" icon="mapa">
          Ver no mapa
        </Button>
        <Button variant="ghost">Ver cupons</Button>
        <Button variant="confirm" icon="check">
          Registrar compra
        </Button>
        <Button variant="danger">Cancelar reserva</Button>
        <Button variant="ouro">Começar</Button>
        <Button variant="primary" size="sm">
          Reservar
        </Button>
        <Button variant="secondary" size="lg">
          Começar
        </Button>
        <Button variant="primary" disabled>
          Esgotado
        </Button>
        <Largura px={340}>
          <Button variant="primary" block>
            Reservar
          </Button>
        </Largura>
      </Bloco>

      <Bloco titulo="Badge">
        <Badge>Térreo</Badge>
        <Badge tone="ouro">10% com cupom</Badge>
        <Badge tone="cerrado" icon="check">
          Em estoque
        </Badge>
        <Badge tone="aviso" icon="relogio">
          Expira em 4 h
        </Badge>
        <Badge tone="perigo" icon="alerta">
          Esgotado
        </Badge>
      </Bloco>

      <Bloco titulo="NivelBadge" nota="Uma volta a mais na espiral a cada nível.">
        <NivelBadge nivel="semente" />
        <NivelBadge nivel="broto" />
        <NivelBadge nivel="capim" />
        <NivelBadge nivel="dourado" />
      </Bloco>

      <Bloco titulo="ProgressoNivel">
        <Largura px={340}>
          <ProgressoNivel pontos={2140} inicio={2000} fim={5000} nivel="capim" proximo="dourado" />
        </Largura>
      </Bloco>

      <Bloco titulo="ProdutoCard">
        <Largura px={248}>
          <ProdutoCard nome="Tênis de corrida Pulse" loja="Loja de esportes" piso="Térreo" precoCentavos={39990} estoque={2} acao="Reservar" />
        </Largura>
        <Largura px={248}>
          <ProdutoCard nome="Perfume Cerrado 100 ml" loja="Perfumaria" piso="Térreo" precoCentavos={24900} estoque={8} selo="10% com cupom" acao="Reservar" />
        </Largura>
        <Largura px={248}>
          <ProdutoCard nome="Jaqueta corta-vento" loja="Moda masculina" piso="Térreo" precoCentavos={18990} estoque={0} acao="Reservar" />
        </Largura>
        <Largura px={360}>
          <ProdutoCard horizontal nome="Tênis Run 2 preto" loja="Calçados" piso="Térreo" precoCentavos={34990} estoque={5} />
        </Largura>
      </Bloco>

      <Bloco titulo="ChatBubble">
        <Largura px={360}>
          <div className="flex flex-col gap-3">
            <ChatBubble de="cliente" anexo="Print de um tênis preto">
              Tem esse tênis aí no shopping? Uso 42.
            </ChatBubble>
            <ChatBubble>Achei dois parecidos aqui no térreo, os dois com o seu número.</ChatBubble>
            <ChatBubble digitando />
          </div>
        </Largura>
      </Bloco>

      <Bloco titulo="ChatComposer">
        <Largura px={360}>
          <ChatComposer />
        </Largura>
      </Bloco>

      <Bloco titulo="CupomTicket">
        <Largura px={340}>
          <CupomTicket titulo="10% em calçados" loja="Loja de esportes" validade="31/12" desconto="10%" />
        </Largura>
        <Largura px={340}>
          <CupomTicket origem="shopping" titulo="Estacionamento grátis" validade="30/11" desconto="2 h" nivel="capim" />
        </Largura>
        <Largura px={340}>
          <CupomTicket origem="shopping" titulo="R$ 20 em qualquer loja" validade="15/12" desconto="R$ 20" />
        </Largura>
      </Bloco>

      <Bloco titulo="CarteiraQR" nota="QR de verdade (qrcode.react), sempre sobre fundo claro.">
        <Largura px={340}>
          <CarteiraQR nome="Ana Souza" nivel="capim" pontos={2140} qrToken="q-demo-ana" />
        </Largura>
      </Bloco>

      <Bloco titulo="ReservaStatus">
        <Largura px={340}>
          <ReservaStatus produto="Tênis de corrida Pulse" loja="Loja de esportes · Térreo" status="PENDENTE" prazo="Expira em 4 h" />
        </Largura>
        <Largura px={340}>
          <ReservaStatus produto="Tênis de corrida Pulse" loja="Loja de esportes · Térreo" status="SEPARADA" pago />
        </Largura>
        <Largura px={340}>
          <ReservaStatus produto="Perfume Cerrado 100 ml" loja="Perfumaria · Térreo" status="RETIRADA" pago />
        </Largura>
      </Bloco>

      <Bloco titulo="FichaCliente" nota="Só interesses nas categorias da loja; nunca a conversa.">
        <Largura px={380}>
          <FichaCliente
            nome="Ana Souza"
            nivel="capim"
            interesses={['Tênis de corrida, número 42, até R$ 400', 'Prefere preto', 'Camisetas dry-fit']}
          />
        </Largura>
        <Largura px={380}>
          <FichaCliente nome="Bruno Lima" nivel="semente" interesses={[]} />
        </Largura>
      </Bloco>

      <Bloco titulo="StatTile">
        <StatTile rotulo="Reservas para hoje" valor="7" nota="2 pagas com Pix" />
        <StatTile rotulo="Vendas pela Capi" valor="R$ 4.380" variacao="+12%" nota="na semana" />
        <StatTile rotulo="Buscado e não achado" valor="120" variacao="-3%" nota="tênis de trilha" />
      </Bloco>

      <Bloco titulo="BottomNav" nota="Toque nas abas. A segunda é a do app (telas.md): sem Buscar.">
        <Largura px={360}>
          <DemoNav />
        </Largura>
        <Largura px={360}>
          <DemoNav abas={['inicio', 'capi', 'mapa', 'carteira']} />
        </Largura>
      </Bloco>
    </section>
  )
}

function Bloco({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-title-sm text-marrom-ink">{titulo}</h3>
        {nota && <p className="text-body-sm text-ink-muted">{nota}</p>}
      </div>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </div>
  )
}

/** Largura do componente no design system publicado (no app, ele ocupa o pai). */
function Largura({ px, children }: { px: 248 | 340 | 360 | 380; children: ReactNode }) {
  const classe = { 248: 'w-[248px]', 340: 'w-[340px]', 360: 'w-[360px]', 380: 'w-[380px]' }[px]
  return <div className={`${classe} max-w-full`}>{children}</div>
}

function DemoNav({ abas }: { abas?: AbaId[] }) {
  const [ativo, setAtivo] = useState<AbaId>(abas?.[0] ?? 'inicio')
  return <BottomNav ativo={ativo} onSelect={setAtivo} abas={abas} />
}

function Movimentos() {
  return (
    <section aria-labelledby="movimentos" className="flex flex-col gap-4">
      <div>
        <h2 id="movimentos" className="text-title-lg">
          Movimentos da marca
        </h2>
        <p className="max-w-[64ch] text-ink-muted">
          GSAP dentro de <code>gsap.matchMedia()</code>: com movimento reduzido no sistema, cada um vira um fade.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <DemoTranca />
        <DemoCascata />
        <DemoPontos />
        <DemoNivel />
      </div>
    </section>
  )
}

function Demo({
  titulo,
  nota,
  onRepetir,
  children,
}: {
  titulo: string
  nota: string
  onRepetir: () => void
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 rounded-md border border-line bg-surface-raised p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-title-sm">{titulo}</h3>
          <p className="text-body-sm text-ink-muted">{nota}</p>
        </div>
        <Button size="sm" onClick={onRepetir}>
          Repetir
        </Button>
      </div>
      {children}
    </div>
  )
}

function useRepetir() {
  const [vez, setVez] = useState(0)
  return [vez, () => setVez((v) => v + 1)] as const
}

function DemoTranca() {
  const [vez, repetir] = useRepetir()
  const marca = useRef<SVGSVGElement>(null)
  const fio = useRef<SVGPathElement>(null)
  useGSAP(
    () => {
      if (!fio.current) return
      const mm = desenharTranca(fio.current, { marca: marca.current })
      return () => mm.revert()
    },
    { dependencies: [vez], revertOnUpdate: true },
  )
  return (
    <Demo titulo="1. A trança se desenha" nota="Abertura do app." onRepetir={repetir}>
      <div className="grid h-40 place-items-center rounded-md bg-terra">
        <svg
          ref={marca}
          viewBox="0 0 32 32"
          className="size-24"
          fill="none"
          stroke="var(--ouro)"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path ref={fio} d="M16 16m-3 0a3 3 0 1 0 6 0a6 6 0 1 0-12 0a9 9 0 1 0 18 0a12 12 0 1 0-24 0" />
        </svg>
      </div>
    </Demo>
  )
}

function DemoCascata() {
  const [vez, repetir] = useRepetir()
  const ref = useEntrada<HTMLDivElement>([vez])
  return (
    <Demo titulo="2. Cards em cascata" nota="Resultados da Capi e entrada das telas (useEntrada)." onRepetir={repetir}>
      <div ref={ref} className="flex flex-col gap-2">
        <div data-anim>
          <ProdutoCard horizontal nome="Tênis de corrida Pulse" loja="Loja de esportes" piso="Térreo" precoCentavos={39990} estoque={2} />
        </div>
        <div data-anim>
          <ProdutoCard horizontal nome="Tênis Run 2 preto" loja="Calçados" piso="Térreo" precoCentavos={34990} estoque={5} />
        </div>
        <div data-anim>
          <ProdutoCard horizontal nome="Perfume Cerrado 100 ml" loja="Perfumaria" piso="Térreo" precoCentavos={24900} estoque={8} />
        </div>
      </div>
    </Demo>
  )
}

function DemoPontos() {
  const [vez, repetir] = useRepetir()
  const recibo = useRef<HTMLDivElement>(null)
  const numero = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      if (!numero.current) return
      const mm = somarPontos(numero.current, { ate: 459, prefixo: '+', destaque: recibo.current })
      return () => mm.revert()
    },
    { dependencies: [vez], revertOnUpdate: true },
  )
  return (
    <Demo titulo="3. Pontos somando" nota="Compra registrada no balcão." onRepetir={repetir}>
      <div
        ref={recibo}
        role="status"
        className="flex flex-wrap items-center gap-2 rounded-md bg-cerrado-soft px-4 py-3 text-body-sm font-medium text-cerrado-ink"
      >
        <Icon name="check" />
        <span>
          Compra registrada. Ana ganhou{' '}
          <strong ref={numero} className="tabular-nums">
            {'+459'}
          </strong>{' '}
          pontos.
        </span>
      </div>
    </Demo>
  )
}

function DemoNivel() {
  const [vez, repetir] = useRepetir()
  const progresso = useRef<HTMLDivElement>(null)
  const selo = useRef<HTMLSpanElement>(null)
  useGSAP(
    () => {
      if (!selo.current) return
      const barra = progresso.current?.querySelector('[data-progresso-barra]')
      const mm = subirDeNivel(selo.current, { barra })
      return () => mm.revert()
    },
    { dependencies: [vez], revertOnUpdate: true },
  )
  return (
    <Demo titulo="4. Subiu de nível" nota="Conquista: no máximo uma por tela." onRepetir={repetir}>
      <div ref={progresso}>
        <ProgressoNivel pontos={5000} inicio={2000} fim={5000} nivel="capim" proximo="dourado" />
      </div>
      <span ref={selo} className="inline-block self-start">
        <NivelBadge nivel="dourado" />
      </span>
    </Demo>
  )
}
