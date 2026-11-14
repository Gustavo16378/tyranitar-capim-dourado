// O aviso de reserva nova do painel da loja (src/loja/avisos/novas.ts, TU43): quais pendentes são
// novas desde a última consulta, as frases do aviso e do selo, e o som ligado por padrão.
import { describe, expect, it } from 'vitest'
import {
  conferirPendentes,
  fraseDasNovas,
  guardarSom,
  rotuloDoSelo,
  somLigado,
  type Armazem,
  type Pendente,
} from '../../src/loja/avisos/novas'
import { numeroDoSelo } from '../../src/painel/contadores'

const reserva = (id: string, produto = 'Camiseta dry-fit', cliente = 'Ana'): Pendente => ({ id, produto, cliente })

function armazemDeTeste(inicial: Record<string, string> = {}): Armazem & { dados: Map<string, string> } {
  const dados = new Map(Object.entries(inicial))
  return { dados, getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => void dados.set(k, v) }
}

describe('TU43: reserva nova no painel da loja', () => {
  it('a primeira consulta só guarda o que já existia: não toca o som', () => {
    const { vistas, novas } = conferirPendentes(null, { itens: [reserva('r1'), reserva('r2')], pendentes: 2 })
    expect(novas).toEqual([])
    expect([...vistas.ids]).toEqual(['r1', 'r2'])
    expect(vistas.pendentes).toBe(2)
  })

  it('a primeira consulta vazia também não avisa; a reserva que chega depois é nova', () => {
    const primeira = conferirPendentes(null, { itens: [], pendentes: 0 })
    expect(primeira.novas).toEqual([])
    const depois = conferirPendentes(primeira.vistas, { itens: [reserva('r1')], pendentes: 1 })
    expect(depois.novas.map((r) => r.id)).toEqual(['r1'])
  })

  it('nova é a pendente com um id que o painel nunca viu, mesmo com o número igual', () => {
    const antes = conferirPendentes(null, { itens: [reserva('r1'), reserva('r2')], pendentes: 2 }).vistas
    // A loja confirmou a r1 e chegou a r3 no mesmo intervalo: o número não mudou, mas há uma nova.
    const agora = conferirPendentes(antes, { itens: [reserva('r2'), reserva('r3', 'Tênis', 'Bia')], pendentes: 2 })
    expect(agora.novas).toEqual([reserva('r3', 'Tênis', 'Bia')])
  })

  it('confirmar uma reserva e ver outra subir na fila não conta como nova', () => {
    const primeira = conferirPendentes(null, { itens: [reserva('r1'), reserva('r2')], pendentes: 2 }).vistas
    const semR1 = conferirPendentes(primeira, { itens: [reserva('r2')], pendentes: 1 })
    expect(semR1.novas).toEqual([])
    // A r1 já foi vista: se ela aparecer de novo na página, não toca outra vez.
    const deNovo = conferirPendentes(semR1.vistas, { itens: [reserva('r1'), reserva('r2')], pendentes: 2 })
    expect(deNovo.novas).toEqual([])
  })

  it('as frases do aviso e do selo', () => {
    expect(fraseDasNovas([])).toBe('')
    expect(fraseDasNovas([reserva('r1')])).toBe('Reserva nova: Camiseta dry-fit para Ana.')
    expect(fraseDasNovas([reserva('r1'), reserva('r2', 'Tênis de corrida Pulse', 'Bia')])).toBe(
      '2 reservas novas: Camiseta dry-fit para Ana e Tênis de corrida Pulse para Bia.',
    )
    const cinco = ['a', 'b', 'c', 'd', 'e'].map((id) => reserva(id, `Produto ${id}`, 'Ana'))
    expect(fraseDasNovas(cinco)).toBe(
      '5 reservas novas: Produto a para Ana, Produto b para Ana, Produto c para Ana e mais 2.',
    )
    expect(rotuloDoSelo(1)).toBe('1 reserva nova')
    expect(rotuloDoSelo(3)).toBe('3 reservas novas')
    expect(numeroDoSelo(7)).toBe('7')
    expect(numeroDoSelo(120)).toBe('99+')
  })

  it('o som vem ligado e a escolha fica guardada no aparelho', () => {
    const armazem = armazemDeTeste()
    expect(somLigado(armazem)).toBe(true)
    guardarSom(false, armazem)
    expect(somLigado(armazem)).toBe(false)
    guardarSom(true, armazem)
    expect(somLigado(armazem)).toBe(true)
  })

  it('sem localStorage (ou com ele bloqueado), o som fica ligado e nada quebra', () => {
    expect(somLigado(undefined)).toBe(true)
    const bloqueado: Armazem = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(somLigado(bloqueado)).toBe(true)
    expect(() => guardarSom(false, bloqueado)).not.toThrow()
  })
})
