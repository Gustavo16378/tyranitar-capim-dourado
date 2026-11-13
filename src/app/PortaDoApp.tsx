import { useCallback, useState } from 'react'
import { Outlet } from 'react-router'
import Abertura from './Abertura'

/**
 * Já mostrou a Abertura neste carregamento da página? Fica no módulo, e não no estado: navegar
 * entre as telas não mostra de novo, mas recarregar ou abrir um link carrega o app do zero e mostra.
 */
let aberturaMostrada = false

/**
 * A porta do app do cliente: a cada carregamento, primeiro a Abertura; depois, a tela que a
 * pessoa abriu (o endereço não muda), inclusive num link direto. Se a tela pede login, o
 * LayoutApp leva para o login e volta para ela depois.
 */
export default function PortaDoApp() {
  const [naAbertura, setNaAbertura] = useState(!aberturaMostrada)
  const terminar = useCallback(() => {
    aberturaMostrada = true
    setNaAbertura(false)
  }, [])
  return naAbertura ? <Abertura aoTerminar={terminar} /> : <Outlet />
}
