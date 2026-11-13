import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { gsap } from 'gsap'
import { comoErroApi, enviarMensagem, listarProdutos, PERGUNTA_DEMO } from '../api'
import { Button, CapiMark, ChatBubble, ChatComposer, ProdutoCard } from '../componentes'
import { APP_NOME } from '../config'
import { comMovimento, DESLOCAMENTO, DURACAO, EASE, MOVIMENTO_REDUZIDO, useGSAP } from '../movimento'
import type { AcaoChat, ProdutoResumo, RespostaChat } from '../tipos'
import { nomeDoPiso } from './formatos'

type Item =
  | { id: number; de: 'cliente'; texto: string; anexo?: string }
  | { id: number; de: 'capi'; texto: string }
  | { id: number; de: 'capi'; produtos: ProdutoResumo[] }

type SemId<T> = T extends unknown ? Omit<T, 'id'> : never
type NovoItem = SemId<Item>

/** Antes da mensagem do roteiro aparecer, e entre uma parte e outra da resposta da Capi. */
const ESPERA_CLIENTE_MS = 500
const ESPERA_PARTE_MS = 700

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms))

/**
 * Se a IA cair (503 IA_INDISPONIVEL), a busca comum continua (RNF10): a resposta vira a lista
 * de produtos do catálogo para o mesmo texto.
 */
async function responder(texto: string): Promise<RespostaChat> {
  try {
    return await enviarMensagem({ texto })
  } catch (falha) {
    const erro = comoErroApi(falha)
    if (erro.erro !== 'IA_INDISPONIVEL') throw erro
    const { itens } = await listarProdutos({ q: texto, tamanho: 3 })
    return {
      resposta: itens.length
        ? 'Estou com dificuldade para pensar agora, mas fiz uma busca comum nas lojas:'
        : 'Estou com dificuldade para pensar agora, e a busca comum não achou nada com essas palavras.',
      produtos: itens,
      acoes: [],
    }
  }
}

/**
 * Capi: a conversa com a assistente. Até a Fase 5, a tela abre tocando o roteiro da
 * demonstração (o print do tênis), e o que o cliente escreve vira uma busca no catálogo.
 */
export default function Capi() {
  const navigate = useNavigate()
  const [itens, setItens] = useState<Item[]>([])
  const [acoes, setAcoes] = useState<AcaoChat[]>([])
  const [digitando, setDigitando] = useState(false)
  const [ocupada, setOcupada] = useState(false)
  const [rodada, setRodada] = useState(0)

  const lista = useRef<HTMLDivElement>(null)
  const fim = useRef<HTMLDivElement>(null)
  const proximoId = useRef(0)
  /** Muda a cada recomeço: uma resposta de uma conversa antiga não entra na nova. */
  const conversa = useRef(0)
  /** As mensagens são respondidas uma de cada vez, na ordem em que foram enviadas. */
  const fila = useRef<Promise<void>>(Promise.resolve())

  const conversar = useCallback((texto: string, anexo?: string) => {
    const minha = conversa.current
    const valendo = () => conversa.current === minha
    const adicionar = (item: NovoItem) => {
      if (valendo()) setItens((atuais) => [...atuais, { ...item, id: proximoId.current++ } as Item])
    }

    fila.current = fila.current.then(async () => {
      if (!valendo()) return
      setOcupada(true)
      setAcoes([])
      adicionar({ de: 'cliente', texto, anexo })
      setDigitando(true)
      try {
        const { resposta, produtos, acoes: novasAcoes } = await responder(texto)
        // Resposta em partes, como na conversa: o primeiro parágrafo, os produtos, o resto.
        const [primeiro, ...resto] = resposta.split(/\n{2,}/)
        const partes: NovoItem[] = [
          { de: 'capi', texto: primeiro },
          ...(produtos.length ? [{ de: 'capi' as const, produtos }] : []),
          ...resto.map((paragrafo) => ({ de: 'capi' as const, texto: paragrafo })),
        ]
        for (const [i, parte] of partes.entries()) {
          if (i > 0) {
            setDigitando(true)
            await esperar(ESPERA_PARTE_MS)
          }
          if (!valendo()) return
          setDigitando(false)
          adicionar(parte)
        }
        if (valendo()) setAcoes(novasAcoes)
      } catch (falha) {
        adicionar({ de: 'capi', texto: comoErroApi(falha).mensagem })
      } finally {
        if (valendo()) {
          setDigitando(false)
          setOcupada(false)
        }
      }
    })
  }, [])

  // Roteiro da demonstração: o cliente manda o print do tênis logo que a tela abre.
  useEffect(() => {
    const espera = window.setTimeout(() => conversar(PERGUNTA_DEMO.texto, PERGUNTA_DEMO.anexo), ESPERA_CLIENTE_MS)
    return () => window.clearTimeout(espera)
  }, [conversar, rodada])

  function verDeNovo() {
    conversa.current++
    fila.current = Promise.resolve()
    setItens([])
    setAcoes([])
    setDigitando(false)
    setOcupada(false)
    setRodada((r) => r + 1)
  }

  function avisarAnexo() {
    setItens((atuais) => [
      ...atuais,
      {
        id: proximoId.current++,
        de: 'capi',
        texto: 'Fotos e links chegam na próxima versão. Por enquanto, me escreva o que você procura.',
      },
    ])
  }

  // Cada mensagem nova sobe e aparece.
  useGSAP(
    () => {
      const ultima = lista.current?.lastElementChild
      if (!ultima) return
      const mm = comMovimento(
        () => {
          gsap.fromTo(
            ultima,
            { y: DESLOCAMENTO * (2 / 3), opacity: 0 },
            { y: 0, opacity: 1, duration: DURACAO.media, ease: EASE.saida },
          )
        },
        () => {},
      )
      return () => mm.revert()
    },
    { dependencies: [itens.length] },
  )

  // A conversa rola até o fim a cada novidade.
  useEffect(() => {
    const reduzir = window.matchMedia(MOVIMENTO_REDUZIDO).matches
    fim.current?.scrollIntoView({ block: 'end', behavior: reduzir ? 'auto' : 'smooth' })
  }, [itens.length, digitando, acoes.length])

  const terminou = !ocupada && itens.length > 0

  return (
    <div className="flex h-full flex-col">
      <title>{`Capi · ${APP_NOME}`}</title>
      <header className="flex flex-none items-center gap-3 border-b bg-surface p-4">
        <span className="grid size-10 flex-none place-items-center rounded-full bg-terra">
          <CapiMark className="size-[26px]" />
        </span>
        <div>
          <h1 className="text-body font-semibold">Capi</h1>
          <p className="text-body-sm text-ink-muted">Assistente do Capim Dourado</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div ref={lista} role="log" aria-live="polite" aria-label="Conversa com a Capi" className="flex flex-col gap-3">
          {itens.map((item) =>
            'produtos' in item ? (
              <ul key={item.id} className="flex flex-col gap-2 pl-10">
                {item.produtos.map((p) => (
                  <li key={p.id}>
                    <Link to={`/produto/${p.id}`} className="block rounded-md">
                      <ProdutoCard
                        horizontal
                        nome={p.nome}
                        loja={p.loja.nome}
                        piso={nomeDoPiso(p.loja.piso)}
                        precoCentavos={p.precoCentavos}
                        estoque={p.estoque}
                        foto={p.foto ?? undefined}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <ChatBubble key={item.id} de={item.de} anexo={item.de === 'cliente' ? item.anexo : undefined}>
                {item.texto}
              </ChatBubble>
            ),
          )}
        </div>
        {digitando && (
          <div className="mt-3">
            <ChatBubble de="capi" digitando />
          </div>
        )}
        {terminou && (
          <div className="mt-3 flex flex-wrap gap-2 pl-10">
            {acoes.map((acao, i) =>
              acao.tipo === 'RESERVAR' ? (
                <Button
                  key={`reservar-${acao.produtoId}`}
                  variant={i === 0 ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => navigate(`/produto/${acao.produtoId}`)}
                >
                  Sim, separar
                </Button>
              ) : acao.tipo === 'ROTA' ? (
                <Button
                  key={`rota-${acao.mapaId}`}
                  size="sm"
                  icon="mapa"
                  onClick={() => navigate(`/mapa?loja=${encodeURIComponent(acao.mapaId)}`)}
                >
                  Ver no mapa
                </Button>
              ) : null,
            )}
            <Button variant="ghost" size="sm" onClick={verDeNovo}>
              Ver de novo
            </Button>
          </div>
        )}
        <div ref={fim} />
      </div>

      <div className="flex-none border-t bg-surface px-4 py-3">
        <ChatComposer onEnviar={(texto) => conversar(texto)} onFoto={avisarAnexo} onLink={avisarAnexo} />
      </div>
    </div>
  )
}
