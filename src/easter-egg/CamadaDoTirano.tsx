import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Button, CapiTirana } from '../componentes'
import { Apagao, Revelar } from './Apagao'
import { AVISOS, BOTAO_ACENDER } from './falas'
import { modoTirano } from './modoTirano'
import { useModoTirano } from './useModoTirano'

/** O evento que tyranitar(), no console do navegador, dispara no window. */
export const EVENTO_ACORDAR = 'tyranitar:acordar'

/**
 * Enquanto as luzes estão apagadas, o app usa o tema escuro, qualquer que seja o do aparelho. Os
 * tokens do escuro já passam no contraste, então nada fica ilegível. Ao acender, o tema volta.
 */
function useTemaDoTirano(ligado: boolean) {
  useEffect(() => {
    if (!ligado) return
    const raiz = document.documentElement
    const antes = raiz.getAttribute('data-theme')
    raiz.setAttribute('data-theme', 'dark')
    return () => {
      if (antes === null) raiz.removeAttribute('data-theme')
      else raiz.setAttribute('data-theme', antes)
    }
  }, [ligado])
}

/** A faixa do topo no modo tirano: o aviso de que as luzes estão apagadas e o botão de acender. */
function FaixaDoTirano({ aoAcender }: { aoAcender: () => void }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return (
    <section
      aria-label="Modo tirano"
      className="flex flex-none items-center gap-3 border-b bg-surface-raised px-4 py-2"
    >
      <span className="grid size-9 flex-none place-items-center rounded-full bg-terra">
        <CapiTirana className="size-6" />
      </span>
      <p className="min-w-0 flex-1 text-body-sm">
        <span className="font-semibold">Modo tirano.</span> As luzes do shopping estão apagadas.
      </p>
      <Button
        size="sm"
        onClick={() => {
          aoAcender()
          // A Loja 13 só existe no escuro: com as luzes acesas, a pessoa volta para o Início.
          if (pathname === '/loja-13') navigate('/inicio')
        }}
      >
        {BOTAO_ACENDER}
      </Button>
    </section>
  )
}

/**
 * O modo tirano no app (docs/easter-egg.md), montado no LayoutApp: o apagão quando o tirano
 * acorda (pela Capi ou pelo tyranitar() do console), o tema escuro e a faixa "Acender as luzes"
 * enquanto as luzes estão apagadas, a camada que clareia no fim, e o aviso para o leitor de tela.
 */
export function CamadaDoTirano() {
  const modo = useModoTirano()
  const navigate = useNavigate()
  const [revelar, setRevelar] = useState<{ vez: number; de: number } | null>(null)
  // O que o leitor de tela ouve: sai do estado do modo, a cada passo.
  const aviso = modo.apagando ? AVISOS.apagando : modo.ligado ? AVISOS.apagadas : modo.acesas > 0 ? AVISOS.acesas : ''

  useEffect(() => {
    const acordar = () => modoTirano.acordar()
    window.addEventListener(EVENTO_ACORDAR, acordar)
    return () => window.removeEventListener(EVENTO_ACORDAR, acordar)
  }, [])

  useTemaDoTirano(modo.ligado)

  // "Acender as luzes": o modo sai e a tela clareia de uma vez, sem piscar.
  const acender = useCallback(() => {
    modoTirano.acender()
    setRevelar((r) => ({ vez: (r?.vez ?? 0) + 1, de: 0.85 }))
  }, [])

  // O apagão terminou com tudo escuro: o app entra no modo tirano e abre o mapa no escuro.
  const aoApagar = useCallback(() => {
    modoTirano.terminarApagao()
    setRevelar((r) => ({ vez: (r?.vez ?? 0) + 1, de: 1 }))
    navigate('/mapa')
  }, [navigate])

  return (
    <>
      <p role="status" className="sr-only">
        {aviso}
      </p>
      {modo.ligado && <FaixaDoTirano aoAcender={acender} />}
      {modo.apagando && <Apagao aoApagar={aoApagar} />}
      {revelar && <Revelar key={revelar.vez} de={revelar.de} aoTerminar={() => setRevelar(null)} />}
    </>
  )
}
