// O aviso de reserva nova (RF20), o Vigia do painel da loja (src/loja/RotasLoja.tsx): enquanto o
// painel está aberto, pergunta à API a cada 20 s quantas reservas esperam a loja responder
// (GET /api/loja/reservas?status=PENDENTE), põe o número no selo do item Reservas e, quando
// aparece uma reserva que o painel não tinha visto, toca um som curto (se a loja não desligou) e
// anuncia no leitor de tela. Com a aba escondida, não pergunta; ao voltar, pergunta na hora.
// As contas, sem DOM, ficam em novas.ts.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ContextoDosContadores, type Contadores } from '../../painel/contadores'
import { listarReservas } from '../api'
import { ContextoDoAviso, type AvisoDeReservasNovas } from './contexto'
import {
  armazemDoNavegador,
  conferirPendentes,
  fraseDasNovas,
  guardarSom,
  INTERVALO_DO_AVISO_MS,
  PENDENTES_POR_CONSULTA,
  rotuloDoSelo,
  somLigado,
  type Pendente,
  type Vistas,
} from './novas'
import { prepararSomNoPrimeiroGesto, tocarSomDeReservaNova } from './som'

/** O caminho da tela Reservas (navegacao.ts): o selo fica ao lado dela. */
const TELA_DAS_RESERVAS = 'reservas'

export function AvisoDeReservas({ children }: { children: ReactNode }) {
  const [pendentes, setPendentes] = useState<number | null>(null)
  const [chegadas, setChegadas] = useState(0)
  const [som, setSom] = useState(() => somLigado(armazemDoNavegador()))
  const [frase, setFrase] = useState('')
  // Cada pedido de recarregar refaz o relógio e pergunta na hora.
  const [pedidos, setPedidos] = useState(0)
  const vistas = useRef<Vistas | null>(null)
  const somAgora = useRef(som)
  const escrever = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    somAgora.current = som
  }, [som])

  useEffect(() => prepararSomNoPrimeiroGesto(), [])
  useEffect(() => () => clearTimeout(escrever.current), [])

  const avisar = useCallback((novas: Pendente[]) => {
    setChegadas((n) => n + 1)
    if (somAgora.current) tocarSomDeReservaNova()
    // Limpa e escreve um instante depois: a mesma frase duas vezes seguidas também é anunciada.
    setFrase('')
    clearTimeout(escrever.current)
    escrever.current = setTimeout(() => setFrase(fraseDasNovas(novas)), 100)
  }, [])

  useEffect(() => {
    let controle: AbortController | null = null

    async function perguntar() {
      if (document.visibilityState === 'hidden') return
      controle?.abort()
      const esta = new AbortController()
      controle = esta
      try {
        const lista = await listarReservas({ status: ['PENDENTE'], tamanho: PENDENTES_POR_CONSULTA }, esta.signal)
        if (esta.signal.aborted) return
        const { vistas: agora, novas } = conferirPendentes(vistas.current, lista)
        vistas.current = agora
        setPendentes(lista.pendentes)
        if (novas.length) avisar(novas)
      } catch {
        // Sem conexão ou servidor fora: o selo fica como estava e a próxima pergunta tenta de novo.
      }
    }

    function aoVoltarParaAba() {
      if (document.visibilityState === 'visible') void perguntar()
    }

    void perguntar()
    const relogio = setInterval(() => void perguntar(), INTERVALO_DO_AVISO_MS)
    document.addEventListener('visibilitychange', aoVoltarParaAba)
    return () => {
      clearInterval(relogio)
      controle?.abort()
      document.removeEventListener('visibilitychange', aoVoltarParaAba)
    }
  }, [pedidos, avisar])

  const mudarSom = useCallback((ligado: boolean) => {
    setSom(ligado)
    guardarSom(ligado, armazemDoNavegador())
    // Ligar é um toque na tela: o navegador deixa tocar, e a loja ouve como é o som.
    if (ligado) tocarSomDeReservaNova()
  }, [])

  const recarregar = useCallback(() => setPedidos((n) => n + 1), [])

  const aviso = useMemo<AvisoDeReservasNovas>(
    () => ({ pendentes, chegadas, som, mudarSom, recarregar }),
    [pendentes, chegadas, som, mudarSom, recarregar],
  )
  const contadores = useMemo<Contadores>(
    () => (pendentes ? { [TELA_DAS_RESERVAS]: { quantidade: pendentes, rotulo: rotuloDoSelo(pendentes), chegadas } } : {}),
    [pendentes, chegadas],
  )

  return (
    <ContextoDoAviso.Provider value={aviso}>
      <ContextoDosContadores.Provider value={contadores}>
        {children}
        {/* Fora das telas, para anunciar em qualquer uma: "Reserva nova: Camiseta dry-fit para Ana." */}
        <p role="status" className="sr-only">
          {frase}
        </p>
      </ContextoDosContadores.Provider>
    </ContextoDoAviso.Provider>
  )
}
