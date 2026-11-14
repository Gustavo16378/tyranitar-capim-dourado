// O coração de salvar (src/app/useSalvos.ts): estado otimista, os pedidos de cada produto em fila,
// desfazer quando a API recusa e os avisos para o leitor de tela.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErroApi } from '../../src/api/cliente'
import { criarSalvos, DURACAO_DO_AVISO_MS, type ApiDosSalvos } from '../../src/app/useSalvos'

const TENIS = { id: 'p-tenis', nome: 'Tênis Run' }

/** Uma API falsa: os pedidos ficam pendentes até o teste responder. */
function apiFalsa(salvosNoServidor: string[] = []) {
  const pedidos: { tipo: 'salvar' | 'tirar'; id: string; responder: (erro?: unknown) => void }[] = []
  const pedir = (tipo: 'salvar' | 'tirar') => (id: string) =>
    new Promise<void>((resolve, reject) => {
      pedidos.push({ tipo, id, responder: (erro) => (erro ? reject(erro) : resolve()) })
    })
  const api: ApiDosSalvos = {
    listar: async () => ({ itens: salvosNoServidor.map((id) => ({ id })) }),
    salvar: pedir('salvar'),
    tirar: pedir('tirar'),
  }
  return { api, pedidos }
}

const recusa = new ErroApi({ status: 0, erro: 'SEM_CONEXAO', mensagem: 'Confira a internet.' })

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('salvos', () => {
  it('carrega os salvos do cliente uma vez', async () => {
    const { api } = apiFalsa(['p-tenis', 'p-perfume'])
    const listar = vi.spyOn(api, 'listar')
    const salvos = criarSalvos(api)
    await salvos.carregar('c-ana')
    await salvos.carregar('c-ana')
    expect(listar).toHaveBeenCalledTimes(1)
    expect([...salvos.ler().ids]).toEqual(['p-tenis', 'p-perfume'])
    expect(salvos.ler().dono).toBe('c-ana')
  })

  it('outro cliente entra: os salvos do anterior somem antes de carregar os dele', async () => {
    const { api } = apiFalsa(['p-tenis'])
    const salvos = criarSalvos(api)
    await salvos.carregar('c-ana')
    api.listar = async () => ({ itens: [] })
    const carregando = salvos.carregar('c-bruno')
    expect(salvos.ler()).toMatchObject({ dono: null, ids: new Set() })
    await carregando
    expect(salvos.ler()).toMatchObject({ dono: 'c-bruno', ids: new Set() })
  })

  it('o coração muda na hora, antes da API responder, e o aviso diz o que mudou', async () => {
    const { api, pedidos } = apiFalsa()
    const salvos = criarSalvos(api)
    const pronto = salvos.alternar(TENIS)
    expect(salvos.ler().ids.has('p-tenis')).toBe(true)
    expect(salvos.ler().aviso).toEqual({ texto: 'Tênis Run está nos seus salvos.', erro: false })
    await vi.waitFor(() => expect(pedidos).toHaveLength(1))
    pedidos[0].responder()
    await pronto
    expect(salvos.ler().ids.has('p-tenis')).toBe(true)

    void salvos.alternar(TENIS)
    expect(salvos.ler().ids.has('p-tenis')).toBe(false)
    expect(salvos.ler().aviso?.texto).toBe('Tênis Run saiu dos seus salvos.')
  })

  it('a API recusa: o coração volta e o aviso de erro aparece', async () => {
    const { api, pedidos } = apiFalsa()
    const salvos = criarSalvos(api)
    const pronto = salvos.alternar(TENIS)
    await vi.waitFor(() => expect(pedidos).toHaveLength(1))
    pedidos[0].responder(recusa)
    await pronto
    expect(salvos.ler().ids.has('p-tenis')).toBe(false)
    expect(salvos.ler().aviso).toEqual({ texto: 'Não deu para salvar Tênis Run. Confira a internet.', erro: true })
    // O aviso some sozinho.
    vi.advanceTimersByTime(DURACAO_DO_AVISO_MS)
    expect(salvos.ler().aviso).toBeNull()
  })

  it('salvar e tirar rápido: os pedidos vão em ordem, um depois do outro', async () => {
    const { api, pedidos } = apiFalsa()
    const salvos = criarSalvos(api)
    const primeiro = salvos.alternar(TENIS)
    const segundo = salvos.alternar(TENIS)
    expect(salvos.ler().ids.has('p-tenis')).toBe(false)
    // O DELETE só sai depois que o PUT respondeu.
    await vi.waitFor(() => expect(pedidos.map((p) => p.tipo)).toEqual(['salvar']))
    pedidos[0].responder()
    await primeiro
    await vi.waitFor(() => expect(pedidos.map((p) => p.tipo)).toEqual(['salvar', 'tirar']))
    pedidos[1].responder()
    await segundo
    expect(salvos.ler().ids.has('p-tenis')).toBe(false)
  })

  it('um pedido antigo que falha não desfaz um toque mais novo', async () => {
    const { api, pedidos } = apiFalsa()
    const salvos = criarSalvos(api)
    const primeiro = salvos.alternar(TENIS) // salvar
    const segundo = salvos.alternar(TENIS) // tirar
    await vi.waitFor(() => expect(pedidos).toHaveLength(1))
    pedidos[0].responder(recusa)
    await primeiro
    // O coração já estava vazio pelo segundo toque: continua vazio.
    expect(salvos.ler().ids.has('p-tenis')).toBe(false)
    await vi.waitFor(() => expect(pedidos).toHaveLength(2))
    pedidos[1].responder()
    await segundo
    expect(salvos.ler().ids.has('p-tenis')).toBe(false)
  })

  it('avisa quem está inscrito a cada mudança', async () => {
    const { api } = apiFalsa()
    const salvos = criarSalvos(api)
    const ouvir = vi.fn()
    const sair = salvos.inscrever(ouvir)
    void salvos.alternar(TENIS)
    expect(ouvir).toHaveBeenCalled()
    sair()
    ouvir.mockClear()
    void salvos.alternar(TENIS)
    expect(ouvir).not.toHaveBeenCalled()
  })
})
