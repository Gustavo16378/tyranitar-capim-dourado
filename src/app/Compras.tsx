import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { comoErroApi, listarCompras, useDados, type ErroApi } from '../api'
import { Button, Icon } from '../componentes'
import { APP_NOME } from '../config'
import { useEntrada } from '../movimento'
import type { CompraDoCliente } from '../tipos'
import { Carregando, ErroTela, Esqueleto, Vazio } from './Estados'
import { ItemDaCompra } from './MinhasCompras'

/** Compras por página. */
const COMPRAS_POR_PAGINA = 10

/**
 * Minhas compras, a lista inteira ("Ver tudo" da Carteira): da mais nova para a mais antiga, dez
 * por vez. "Mostrar mais" traz a próxima página embaixo e põe o foco na primeira que chegou.
 */
export default function Compras() {
  const primeira = useDados(() => listarCompras({ pagina: 1, tamanho: COMPRAS_POR_PAGINA }), 'compras')
  const [mais, setMais] = useState<CompraDoCliente[]>([])
  const [proxima, setProxima] = useState(2)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<ErroApi | null>(null)
  const primeiraNova = useRef<HTMLLIElement>(null)
  const [focarEm, setFocarEm] = useState<string | null>(null)
  const topo = useEntrada<HTMLDivElement>()
  const tela = useEntrada<HTMLDivElement>([primeira.tipo])

  const compras = primeira.tipo === 'ok' ? [...primeira.dados.itens, ...mais] : []
  const total = primeira.tipo === 'ok' ? primeira.dados.total : 0

  useEffect(() => {
    if (focarEm) primeiraNova.current?.focus()
  }, [focarEm])

  async function mostrarMais() {
    setCarregando(true)
    setErro(null)
    try {
      const pagina = await listarCompras({ pagina: proxima, tamanho: COMPRAS_POR_PAGINA })
      setMais((atuais) => [...atuais, ...pagina.itens])
      setProxima((p) => p + 1)
      setFocarEm(pagina.itens[0]?.id ?? null)
    } catch (falha) {
      setErro(comoErroApi(falha))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <title>{`Minhas compras · ${APP_NOME}`}</title>
      <div ref={topo} className="flex flex-col items-start gap-3">
        <Link
          data-anim
          to="/carteira"
          className="inline-flex items-center gap-1 py-1 text-label text-marrom-ink no-underline"
        >
          <Icon name="seta" className="size-4 -rotate-[135deg]" />
          Carteira
        </Link>
        <h1 data-anim className="text-title-lg">
          Minhas compras
        </h1>
      </div>

      <div ref={tela} className="flex flex-col gap-4">
        {primeira.tipo === 'carregando' && (
          <Carregando className="flex flex-col gap-3">
            <Esqueleto className="h-[92px]" />
            <Esqueleto className="h-[92px]" />
            <Esqueleto className="h-[92px]" />
          </Carregando>
        )}
        {primeira.tipo === 'erro' && <ErroTela erro={primeira.erro} onTentar={primeira.recarregar} />}
        {primeira.tipo === 'ok' && total === 0 && (
          <Vazio>Nenhuma compra ainda. Mostre o QR da carteira no caixa para juntar pontos.</Vazio>
        )}
        {compras.length > 0 && (
          <>
            <ul data-anim aria-label="Compras" className="flex flex-col gap-3">
              {compras.map((compra) => (
                <ItemDaCompra
                  key={compra.id}
                  compra={compra}
                  ref={compra.id === focarEm ? primeiraNova : undefined}
                />
              ))}
            </ul>
            <p role="status" className="text-center text-body-sm text-ink-muted">
              {compras.length === total
                ? `${total === 1 ? 'Sua compra' : `Todas as ${total} compras`}.`
                : `Mostrando ${compras.length} de ${total} compras.`}
            </p>
            {erro && <ErroTela erro={erro} onTentar={mostrarMais} />}
            {compras.length < total && !erro && (
              <Button block disabled={carregando} aria-busy={carregando} onClick={mostrarMais}>
                {carregando ? 'Carregando…' : 'Mostrar mais'}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
