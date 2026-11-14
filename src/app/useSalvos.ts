// O coração de salvar, o mesmo em todas as telas do app (Início, Capi, Produto, a página da loja
// e Salvos para provar): quais produtos o cliente salvou, carregados uma vez por cliente, e
// alternar() com estado otimista. O coração muda na hora; se a API recusar, ele volta e o aviso
// diz o que houve. Os avisos saem no AvisoDosSalvos (role="status", no LayoutApp), para o leitor
// de tela; os de erro também aparecem na tela.
import { useEffect, useSyncExternalStore } from 'react'
import { comoErroApi, listarFavoritos, salvarFavorito, tirarFavorito, useSessao } from '../api'

/** As chamadas da API que os salvos usam (nos testes, falsas). */
export interface ApiDosSalvos {
  listar: () => Promise<{ itens: { id: string }[] }>
  salvar: (produtoId: string) => Promise<void>
  tirar: (produtoId: string) => Promise<void>
}

export interface AvisoDosSalvos {
  texto: string
  erro: boolean
}

export interface EstadoDosSalvos {
  /** O cliente dono dos ids; null antes de carregar (ou depois de sair). */
  dono: string | null
  ids: ReadonlySet<string>
  aviso: AvisoDosSalvos | null
}

/** Quanto tempo o aviso fica (o de erro, na tela). */
export const DURACAO_DO_AVISO_MS = 6000

/** Os salvos carregam até 100 (o máximo de uma página da API). */
const MAXIMO = 100

export function criarSalvos(api: ApiDosSalvos) {
  let estado: EstadoDosSalvos = { dono: null, ids: new Set(), aviso: null }
  const ouvintes = new Set<() => void>()
  // Os pedidos de cada produto, um depois do outro: salvar e tirar rápido não chegam trocados.
  const filas = new Map<string, Promise<void>>()
  let carregando: string | null = null
  let relogio: ReturnType<typeof setTimeout> | undefined

  function mudar(parcial: Partial<EstadoDosSalvos>) {
    estado = { ...estado, ...parcial }
    ouvintes.forEach((ouvir) => ouvir())
  }

  function marcar(produtoId: string, salvo: boolean) {
    const ids = new Set(estado.ids)
    if (salvo) ids.add(produtoId)
    else ids.delete(produtoId)
    mudar({ ids })
  }

  function avisar(texto: string, erro = false) {
    clearTimeout(relogio)
    mudar({ aviso: { texto, erro } })
    relogio = setTimeout(() => mudar({ aviso: null }), DURACAO_DO_AVISO_MS)
  }

  return {
    inscrever(ouvir: () => void) {
      ouvintes.add(ouvir)
      return () => {
        ouvintes.delete(ouvir)
      }
    },

    ler: () => estado,

    /** Carrega os salvos do cliente: uma vez, e de novo só quando outro cliente entra. */
    async carregar(dono: string) {
      if (estado.dono === dono || carregando === dono) return
      carregando = dono
      if (estado.dono !== null) mudar({ dono: null, ids: new Set() })
      try {
        const { itens } = await api.listar()
        if (carregando === dono) mudar({ dono, ids: new Set(itens.map((p) => p.id)) })
      } catch {
        // Sem a lista, os corações começam vazios; a próxima tela tenta de novo.
      } finally {
        if (carregando === dono) carregando = null
      }
    },

    /** Salva ou tira dos salvos. O coração muda na hora; a promessa acaba quando a API responde. */
    alternar(produto: { id: string; nome: string }) {
      const salvar = !estado.ids.has(produto.id)
      marcar(produto.id, salvar)
      avisar(salvar ? `${produto.nome} está nos seus salvos.` : `${produto.nome} saiu dos seus salvos.`)
      const anterior = filas.get(produto.id) ?? Promise.resolve()
      const pedido = anterior
        .then(() => (salvar ? api.salvar(produto.id) : api.tirar(produto.id)))
        .catch((erro: unknown) => {
          // Volta o coração, se ninguém tocou nele de novo nesse meio-tempo.
          if (estado.ids.has(produto.id) === salvar) marcar(produto.id, !salvar)
          const acao = salvar ? `salvar ${produto.nome}` : `tirar ${produto.nome} dos salvos`
          avisar(`Não deu para ${acao}. ${comoErroApi(erro).mensagem}`, true)
        })
      filas.set(produto.id, pedido)
      return pedido
    },
  }
}

export type Salvos = ReturnType<typeof criarSalvos>

const salvos = criarSalvos({
  listar: () => listarFavoritos({ tamanho: MAXIMO }),
  salvar: salvarFavorito,
  tirar: tirarFavorito,
})

/**
 * Os salvos do cliente logado: salvo(id) para o coração e alternar(produto) para o toque.
 * Sem cliente logado, nada fica salvo.
 */
export function useSalvos() {
  const usuario = useSessao()?.usuario
  const clienteId = usuario?.perfil === 'CLIENTE' ? usuario.id : null
  const estado = useSyncExternalStore(salvos.inscrever, salvos.ler)

  useEffect(() => {
    if (clienteId) void salvos.carregar(clienteId)
  }, [clienteId])

  const meus = clienteId !== null && (estado.dono === clienteId || estado.dono === null)
  return {
    salvo: (produtoId: string) => meus && estado.ids.has(produtoId),
    alternar: salvos.alternar,
    aviso: estado.aviso,
  }
}
