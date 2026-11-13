import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { gsap } from 'gsap'
import {
  apagarConversa,
  comoErroApi,
  enviarMensagem,
  listarProdutos,
  obterConversa,
  PERGUNTA_DEMO,
  separarLink,
  termosDoLink,
} from '../api'
import { Button, CapiMark, ChatBubble, ChatComposer, Icon, ProdutoCard } from '../componentes'
import { cx } from '../componentes/cx'
import { APP_NOME } from '../config'
import { cascata, comMovimento, DESLOCAMENTO, DURACAO, EASE, MOVIMENTO_REDUZIDO, useGSAP } from '../movimento'
import type { AcaoChat, MensagemChat, MensagemDoHistorico, ProdutoResumo, RespostaChat } from '../tipos'
import { acoesNaConversa } from './acoesDoChat'
import { FolhaLink } from './FolhaLink'
import { nomeDoPiso, partesDoLink } from './formatos'
import { reduzirFoto } from './foto'

type Item =
  | { id: number; de: 'cliente'; texto: string; anexo?: string; foto?: string; fotoEnviada?: boolean; link?: string }
  | { id: number; de: 'capi'; texto: string }
  | { id: number; de: 'capi'; produtos: ProdutoResumo[] }

type SemId<T> = T extends unknown ? Omit<T, 'id'> : never
type NovoItem = SemId<Item>

/** O que o cliente manda: a mensagem do contrato e, para a prévia, a foto como data URL. */
interface Envio extends MensagemChat {
  foto?: string
}

/** Foto reduzida, pronta para ir junto com a próxima mensagem. */
interface FotoAnexada {
  imagem: NonNullable<MensagemChat['imagem']>
  previa: string
}

/** Entre uma parte e outra da resposta da Capi. */
const ESPERA_PARTE_MS = 700
/** Depois disso esperando a resposta, o app avisa que a Capi está procurando. */
export const AVISO_PROCURANDO_MS = 2_000
/** Depois disso, a espera acaba com uma mensagem amigável e "Tentar de novo". */
export const TEMPO_LIMITE_MS = 25_000

const MENSAGEM_TEMPO_ESGOTADO =
  'A Capi está demorando mais que o normal para responder. Pode ser a internet ou muita gente procurando agora. Tente de novo.'

/** As sugestões de texto da tela vazia: tocar só preenche o campo. */
const SUGESTOES = ['Quero um presente para minha mãe até R$ 150', 'Onde fica a Renner?', 'Tem perfume amadeirado?']

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms))

/** O print do tênis da sugestão com foto (public/demo), reduzido como as fotos do cliente. */
async function carregarPrintDaDemo() {
  const resposta = await fetch(PERGUNTA_DEMO.imagem)
  if (!resposta.ok) throw new Error('O print da demonstração não carregou.')
  const blob = await resposta.blob()
  return reduzirFoto(new File([blob], 'print-tenis.jpg', { type: blob.type || 'image/jpeg' }))
}

/**
 * Se a IA cair (503 IA_INDISPONIVEL), a busca comum continua (RNF10): o texto, ou as palavras do
 * endereço do link, viram uma busca no catálogo. Foto sozinha não dá para buscar sem a Capi.
 */
async function responder({ texto, imagem, link }: Envio, sinal: AbortSignal): Promise<RespostaChat> {
  try {
    return await enviarMensagem({ texto, ...(imagem ? { imagem } : {}), ...(link ? { link } : {}) }, sinal)
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

/** A resposta em partes, como na conversa: o primeiro parágrafo, os produtos, o resto. */
function partesDaResposta(resposta: string, produtos: ProdutoResumo[]): NovoItem[] {
  const [primeiro, ...resto] = resposta.split(/\n{2,}/)
  return [
    { de: 'capi', texto: primeiro },
    ...(produtos.length ? [{ de: 'capi' as const, produtos }] : []),
    ...resto.map((paragrafo) => ({ de: 'capi' as const, texto: paragrafo })),
  ]
}

/** Uma mensagem da conversa salva, como ela aparece na tela (a foto, que não é guardada, vira um selo). */
function doHistorico(mensagem: MensagemDoHistorico): NovoItem[] {
  if (mensagem.papel === 'CLIENTE') return [{ de: 'cliente', texto: mensagem.conteudo, fotoEnviada: mensagem.foto }]
  return partesDaResposta(mensagem.conteudo, mensagem.produtos ?? [])
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

/** A tela vazia: sugestões que só preenchem o campo, sem enviar. */
function Sugestoes({ aoEscolherFoto, aoEscolherTexto }: { aoEscolherFoto: () => void; aoEscolherTexto: (texto: string) => void }) {
  return (
    <section aria-labelledby="titulo-sugestoes" className="flex flex-col gap-3">
      <h3 id="titulo-sugestoes" className="text-body-sm text-ink-muted">
        Pergunte por texto, mande uma foto ou cole o link de um produto de outra loja. Ou comece por uma destas:
      </h3>
      <button
        type="button"
        onClick={aoEscolherFoto}
        className="flex cursor-pointer items-center gap-3 rounded-md border bg-surface-raised p-3 text-left text-ink"
      >
        <img src={PERGUNTA_DEMO.imagem} alt="" className="size-14 flex-none rounded-sm object-cover" />
        <span className="min-w-0">
          <span className="block text-label">{PERGUNTA_DEMO.texto}</span>
          <span className="block text-body-sm text-ink-muted">Com a foto do tênis</span>
        </span>
      </button>
      <ul className="flex flex-wrap gap-2">
        {SUGESTOES.map((texto) => (
          <li key={texto}>
            <button
              type="button"
              onClick={() => aoEscolherTexto(texto)}
              className="cursor-pointer rounded-pill border bg-surface-raised px-3 py-2 text-left text-body-sm text-ink"
            >
              {texto}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Capi: a conversa com a assistente, por texto, foto (câmera ou galeria) ou link de loja online.
 * Abre a conversa salva (GET /api/chat); vazia, mostra sugestões que só preenchem o campo. Só o
 * "Nova conversa" apaga a conversa.
 */
export default function Capi() {
  const navigate = useNavigate()
  const [itens, setItens] = useState<Item[]>([])
  const [acoes, setAcoes] = useState<AcaoChat[]>([])
  const [carregando, setCarregando] = useState(true)
  const [digitando, setDigitando] = useState(false)
  const [procurando, setProcurando] = useState(false)
  const [ocupada, setOcupada] = useState(false)
  const [paraTentarDeNovo, setParaTentarDeNovo] = useState<Envio | null>(null)
  const [folhaLink, setFolhaLink] = useState(false)
  /** O texto que uma sugestão pôs no campo: a versão nova remonta o campo com ele. */
  const [rascunho, setRascunho] = useState({ texto: '', versao: 0 })
  const [anexo, setAnexo] = useState<FotoAnexada | null>(null)

  const lista = useRef<HTMLDivElement>(null)
  const fim = useRef<HTMLDivElement>(null)
  const seletorDeFoto = useRef<HTMLInputElement>(null)
  const proximoId = useRef(0)
  /** Muda a cada recomeço: uma resposta de uma conversa antiga não entra na nova. */
  const conversa = useRef(0)
  /** As mensagens são respondidas uma de cada vez, na ordem em que foram enviadas. */
  const fila = useRef<Promise<void>>(Promise.resolve())

  const comId = (item: NovoItem) => ({ ...item, id: proximoId.current++ }) as Item

  // A conversa salva: ao voltar para a Capi, ela continua de onde parou.
  useEffect(() => {
    let cancelado = false
    obterConversa()
      .then(({ itens: salvas }) => {
        if (!cancelado && salvas.length) setItens((atuais) => [...salvas.flatMap(doHistorico).map(comId), ...atuais])
      })
      // Sem o histórico, a conversa começa vazia; a próxima mensagem funciona igual.
      .catch(() => {})
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })
    return () => {
      cancelado = true
    }
  }, [])

  const conversar = useCallback(
    (envio: Envio, { repetir = false } = {}) => {
      const minha = conversa.current
      const valendo = () => conversa.current === minha
      const adicionar = (item: NovoItem) => {
        if (valendo()) setItens((atuais) => [...atuais, comId(item)])
      }

      fila.current = fila.current.then(async () => {
        if (!valendo()) return
        setOcupada(true)
        setAcoes([])
        setParaTentarDeNovo(null)
        if (!repetir) adicionar({ de: 'cliente', texto: envio.texto, foto: envio.foto, link: envio.link })
        setDigitando(true)
        // Passados 2 s, o app diz o que está acontecendo; passados 25 s, desiste com um recado.
        const controle = new AbortController()
        let esgotou = false
        const aviso = window.setTimeout(() => valendo() && setProcurando(true), AVISO_PROCURANDO_MS)
        const limite = window.setTimeout(() => {
          esgotou = true
          controle.abort()
        }, TEMPO_LIMITE_MS)
        try {
          const { resposta, produtos, acoes: novasAcoes } = await responder(envio, controle.signal)
          window.clearTimeout(aviso)
          setProcurando(false)
          for (const [i, parte] of partesDaResposta(resposta, produtos).entries()) {
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
          const erro = comoErroApi(falha)
          adicionar({ de: 'capi', texto: esgotou ? MENSAGEM_TEMPO_ESGOTADO : erro.mensagem })
          // Tempo esgotado, sem conexão ou falha do servidor: vale tentar de novo a mesma mensagem.
          if (valendo() && (esgotou || erro.status === 0 || erro.status >= 500)) setParaTentarDeNovo(envio)
        } finally {
          window.clearTimeout(aviso)
          window.clearTimeout(limite)
          if (valendo()) {
            setProcurando(false)
            setDigitando(false)
            setOcupada(false)
          }
        }
      })
    },
    [navigate],
  )

  /** "Nova conversa": apaga a conversa salva e volta às sugestões. */
  async function novaConversa() {
    try {
      await apagarConversa()
    } catch (falha) {
      avisar(comoErroApi(falha).mensagem)
      return
    }
    conversa.current++
    fila.current = Promise.resolve()
    setItens([])
    setAcoes([])
    setDigitando(false)
    setProcurando(false)
    setOcupada(false)
    setParaTentarDeNovo(null)
    setAnexo(null)
    setRascunho((r) => ({ texto: '', versao: r.versao + 1 }))
  }

  /** Recado da Capi que não passa pela API (foto que não abriu, por exemplo). */
  function avisar(texto: string) {
    setItens((atuais) => [...atuais, comId({ de: 'capi', texto })])
  }

  function preencher(texto: string) {
    setRascunho((r) => ({ texto, versao: r.versao + 1 }))
  }

  /** A sugestão com foto: anexa o print do tênis e põe a pergunta no campo, sem enviar. */
  async function escolherSugestaoComFoto() {
    preencher(PERGUNTA_DEMO.texto)
    try {
      const { imagem, previa } = await carregarPrintDaDemo()
      setAnexo({ imagem, previa })
    } catch {
      // Sem o print, a pergunta vai só com o texto.
    }
  }

  function enviarDoCampo(texto: string) {
    if (anexo) {
      conversar({ texto, imagem: anexo.imagem, foto: anexo.previa })
      setAnexo(null)
    } else if (texto) {
      conversar(separarLink(texto))
    }
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
  }, [itens.length, digitando, procurando, acoes.length])

  const terminou = !ocupada && itens.length > 0
  const { botoes } = acoesNaConversa(acoes)
  const vazia = !carregando && !ocupada && itens.length === 0

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
        {itens.length > 0 && (
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={novaConversa}>
              Nova conversa
            </Button>
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {/* Para a ordem dos títulos: os cartões de produto têm h3. */}
        <h2 className="sr-only">Conversa</h2>
        {vazia && <Sugestoes aoEscolherFoto={escolherSugestaoComFoto} aoEscolherTexto={preencher} />}
        <div ref={lista} role="log" aria-live="polite" aria-label="Conversa com a Capi" className="flex flex-col gap-3">
          {itens.map((item) =>
            'produtos' in item ? (
              <ul key={item.id} className="flex flex-col gap-2 pl-10 md:grid md:grid-cols-2">
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
                {/* Na conversa salva a foto não volta (não é guardada): fica o selo. */}
                {item.fotoEnviada && !item.foto && (
                  <span className={cx('flex items-center gap-1 text-body-sm', item.texto && 'mb-1')}>
                    <Icon name="camera" className="size-4" />
                    Foto enviada
                  </span>
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
          <div className="mt-3 flex flex-col gap-1">
            <ChatBubble de="capi" digitando />
            {procurando && (
              <p role="status" className="pl-10 text-body-sm text-ink-muted">
                A Capi está procurando nas lojas…
              </p>
            )}
          </div>
        )}
        {terminou && (botoes.length > 0 || paraTentarDeNovo) && (
          <div className="mt-3 flex flex-wrap gap-2 pl-10">
            {paraTentarDeNovo && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const envio = paraTentarDeNovo
                  setParaTentarDeNovo(null)
                  conversar(envio, { repetir: true })
                }}
              >
                Tentar de novo
              </Button>
            )}
            {botoes.map((botao) => (
              <Button
                key={botao.chave}
                variant={botao.principal && !paraTentarDeNovo ? 'primary' : 'secondary'}
                size="sm"
                icon={botao.icone}
                onClick={() => navigate(botao.destino)}
              >
                {botao.rotulo}
              </Button>
            ))}
          </div>
        )}
        <div ref={fim} />
      </div>

      <div className="flex-none border-t bg-surface px-4 py-3">
        {anexo && (
          <div className="mb-2 flex items-center gap-3">
            <img src={anexo.previa} alt="Foto anexada" className="size-12 flex-none rounded-sm object-cover" />
            <span className="flex-1 text-body-sm text-ink-muted">Foto anexada: vai junto com a mensagem.</span>
            <Button variant="ghost" size="sm" onClick={() => setAnexo(null)}>
              Remover foto
            </Button>
          </div>
        )}
        <ChatComposer
          key={rascunho.versao}
          valor={rascunho.texto}
          focar={rascunho.versao > 0}
          permitirVazio={Boolean(anexo)}
          onEnviar={enviarDoCampo}
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
