import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { gsap } from 'gsap'
import { comoErroApi, enviarMensagem, listarProdutos, PERGUNTA_DEMO, separarLink, termosDoLink } from '../api'
import { Button, CapiMark, ChatBubble, ChatComposer, Icon, ProdutoCard } from '../componentes'
import { cx } from '../componentes/cx'
import { APP_NOME } from '../config'
import { cascata, comMovimento, DESLOCAMENTO, DURACAO, EASE, MOVIMENTO_REDUZIDO, useGSAP } from '../movimento'
import type { AcaoChat, MensagemChat, ProdutoResumo, RespostaChat } from '../tipos'
import { acoesNaConversa } from './acoesDoChat'
import { FolhaLink } from './FolhaLink'
import { nomeDoPiso, partesDoLink } from './formatos'
import { reduzirFoto } from './foto'

type Item =
  | { id: number; de: 'cliente'; texto: string; anexo?: string; foto?: string; link?: string }
  | { id: number; de: 'capi'; texto: string }
  | { id: number; de: 'capi'; produtos: ProdutoResumo[] }

type SemId<T> = T extends unknown ? Omit<T, 'id'> : never
type NovoItem = SemId<Item>

/** O que o cliente manda: a mensagem do contrato e, para a prévia, a foto como data URL. */
interface Envio extends MensagemChat {
  foto?: string
  /** Descrição do print do roteiro da demonstração (não há foto de verdade). */
  anexo?: string
}

/** Antes da mensagem do roteiro aparecer, e entre uma parte e outra da resposta da Capi. */
const ESPERA_CLIENTE_MS = 500
const ESPERA_PARTE_MS = 700

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms))

/**
 * Se a IA cair (503 IA_INDISPONIVEL), a busca comum continua (RNF10): o texto, ou as palavras do
 * endereço do link, viram uma busca no catálogo. Foto sozinha não dá para buscar sem a Capi.
 */
async function responder({ texto, imagem, link }: Envio): Promise<RespostaChat> {
  try {
    return await enviarMensagem({ texto, ...(imagem ? { imagem } : {}), ...(link ? { link } : {}) })
  } catch (falha) {
    const erro = comoErroApi(falha)
    if (erro.erro !== 'IA_INDISPONIVEL') throw erro
    const termos = [texto, link ? termosDoLink(link) : ''].join(' ').trim()
    if (!termos) {
      return {
        resposta:
          'Estou com dificuldade para ver fotos agora. Me escreva o que você procura que eu faço uma busca comum.',
        produtos: [],
        acoes: [],
      }
    }
    const { itens } = await listarProdutos({ q: termos, tamanho: 3 })
    return {
      resposta: itens.length
        ? 'Estou com dificuldade para pensar agora, mas fiz uma busca comum nas lojas:'
        : 'Estou com dificuldade para pensar agora, e a busca comum não achou nada com essas palavras.',
      produtos: itens,
      acoes: [],
    }
  }
}

/** Prévia do link que o cliente mandou: o site e o caminho do produto. */
function PreviaDoLink({ link, comTexto }: { link: string; comTexto: boolean }) {
  const { site, caminho } = partesDoLink(link)
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={cx('flex items-center gap-2 rounded-sm border bg-surface-raised p-2.5 text-ink', comTexto && 'mb-2')}
    >
      <Icon name="link" className="text-marrom-ink" />
      <span className="min-w-0">
        <span className="block truncate text-label">{site}</span>
        <span className="block truncate text-body-sm text-ink-muted">{caminho}</span>
      </span>
      <span className="sr-only">(abre em outra aba)</span>
    </a>
  )
}

/**
 * Capi: a conversa com a assistente, por texto, foto (câmera ou galeria) ou link de loja online.
 * Com o chat em mock, a tela abre tocando o roteiro da demonstração (o print do tênis).
 */
export default function Capi() {
  const navigate = useNavigate()
  const [itens, setItens] = useState<Item[]>([])
  const [acoes, setAcoes] = useState<AcaoChat[]>([])
  const [digitando, setDigitando] = useState(false)
  const [ocupada, setOcupada] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [folhaLink, setFolhaLink] = useState(false)

  const lista = useRef<HTMLDivElement>(null)
  const fim = useRef<HTMLDivElement>(null)
  const seletorDeFoto = useRef<HTMLInputElement>(null)
  const proximoId = useRef(0)
  /** Muda a cada recomeço: uma resposta de uma conversa antiga não entra na nova. */
  const conversa = useRef(0)
  /** As mensagens são respondidas uma de cada vez, na ordem em que foram enviadas. */
  const fila = useRef<Promise<void>>(Promise.resolve())

  const conversar = useCallback(
    (envio: Envio) => {
      const minha = conversa.current
      const valendo = () => conversa.current === minha
      const adicionar = (item: NovoItem) => {
        if (valendo()) setItens((atuais) => [...atuais, { ...item, id: proximoId.current++ } as Item])
      }

      fila.current = fila.current.then(async () => {
        if (!valendo()) return
        setOcupada(true)
        setAcoes([])
        adicionar({ de: 'cliente', texto: envio.texto, anexo: envio.anexo, foto: envio.foto, link: envio.link })
        setDigitando(true)
        try {
          const { resposta, produtos, acoes: novasAcoes } = await responder(envio)
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
          if (!valendo()) return
          setAcoes(novasAcoes)
          // A Capi reservou com Pix: o app abre o pagamento.
          const { abrirSozinho } = acoesNaConversa(novasAcoes)
          if (abrirSozinho) navigate(abrirSozinho)
        } catch (falha) {
          adicionar({ de: 'capi', texto: comoErroApi(falha).mensagem })
        } finally {
          if (valendo()) {
            setDigitando(false)
            setOcupada(false)
          }
        }
      })
    },
    [navigate],
  )

  // Roteiro da demonstração: o cliente manda o print do tênis logo que a tela abre.
  useEffect(() => {
    const espera = window.setTimeout(
      () => conversar({ texto: PERGUNTA_DEMO.texto, anexo: PERGUNTA_DEMO.anexo }),
      ESPERA_CLIENTE_MS,
    )
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

  /** Recado da Capi que não passa pela API (foto que não abriu, por exemplo). */
  function avisar(texto: string) {
    setItens((atuais) => [...atuais, { id: proximoId.current++, de: 'capi', texto }])
  }

  async function aoEscolherFoto(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    // Limpa o seletor para dar para mandar a mesma foto de novo.
    evento.target.value = ''
    if (!arquivo) return
    try {
      const { imagem, previa } = await reduzirFoto(arquivo)
      conversar({ texto: '', imagem, foto: previa })
    } catch (falha) {
      avisar(falha instanceof Error ? falha.message : 'Não consegui abrir essa foto. Tente outra.')
    }
  }

  // Os resultados entram em cascata, um cartão depois do outro (movimento 2 da marca); os
  // balões sobem 16 px e aparecem, como no protótipo.
  useGSAP(
    () => {
      const ultima = lista.current?.lastElementChild
      if (!ultima) return
      const mm =
        ultima.tagName === 'UL'
          ? cascata(Array.from(ultima.children))
          : comMovimento(
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
  const { botoes } = acoesNaConversa(acoes)

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
        {/* Para a ordem dos títulos: os cartões de produto têm h3. */}
        <h2 className="sr-only">Conversa</h2>
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
            ) : item.de === 'cliente' ? (
              <ChatBubble key={item.id} de="cliente" anexo={item.anexo}>
                {item.foto && (
                  <img
                    src={item.foto}
                    alt="Foto que você enviou"
                    className={cx('block max-h-60 max-w-full rounded-sm', item.texto && 'mb-2')}
                  />
                )}
                {item.link && <PreviaDoLink link={item.link} comTexto={Boolean(item.texto)} />}
                {item.texto}
              </ChatBubble>
            ) : (
              <ChatBubble key={item.id} de="capi">
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
            {botoes.map((botao) => (
              <Button
                key={botao.chave}
                variant={botao.principal ? 'primary' : 'secondary'}
                size="sm"
                icon={botao.icone}
                onClick={() => navigate(botao.destino)}
              >
                {botao.rotulo}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={verDeNovo}>
              Ver de novo
            </Button>
          </div>
        )}
        <div ref={fim} />
      </div>

      <div className="flex-none border-t bg-surface px-4 py-3">
        <ChatComposer
          onEnviar={(mensagem) => conversar(separarLink(mensagem))}
          onFoto={() => seletorDeFoto.current?.click()}
          onLink={() => setFolhaLink(true)}
        />
        {/* Sem "capture": no celular, o sistema oferece câmera ou galeria. */}
        <input ref={seletorDeFoto} type="file" accept="image/*" className="hidden" onChange={aoEscolherFoto} />
      </div>

      <FolhaLink
        aberta={folhaLink}
        onFechar={() => setFolhaLink(false)}
        onEnviar={(link) => conversar({ texto: '', link })}
      />
    </div>
  )
}
