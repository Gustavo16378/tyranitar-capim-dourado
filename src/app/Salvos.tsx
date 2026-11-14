import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { listarFavoritos, useDados } from '../api'
import { Button } from '../componentes'
import { APP_NOME } from '../config'
import { useEntrada } from '../movimento'
import type { ProdutoResumo } from '../tipos'
import { agruparPorLoja } from './agrupar'
import { caminhoAteALoja, caminhoDaLoja } from './caminhos'
import { CartaoDoProduto } from './CartaoDoProduto'
import { Carregando, ErroTela, Esqueleto, Vazio } from './Estados'
import { FolhaReserva } from './FolhaReserva'
import { nomeDoPiso } from './formatos'

/** Os salvos de uma vez (o máximo de uma página da API). */
const MAXIMO = 100

/**
 * Salvos para provar: os produtos com o coração, agrupados por loja, para ir provar. Cada produto
 * tem "Reservar" e cada loja, "Como chegar". Tirar o coração aqui deixa o produto na lista até
 * a próxima visita, para dar para voltar atrás.
 */
export default function Salvos() {
  const navigate = useNavigate()
  const salvos = useDados(() => listarFavoritos({ tamanho: MAXIMO }), 'salvos')
  const [escolhido, setEscolhido] = useState<ProdutoResumo | null>(null)
  const [folhaAberta, setFolhaAberta] = useState(false)
  const topo = useEntrada<HTMLDivElement>()
  const tela = useEntrada<HTMLDivElement>([salvos.tipo])
  const grupos = salvos.tipo === 'ok' ? agruparPorLoja(salvos.dados.itens) : []

  function reservar(produto: ProdutoResumo) {
    setEscolhido(produto)
    setFolhaAberta(true)
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <title>{`Salvos para provar · ${APP_NOME}`}</title>
      <div ref={topo}>
        <h1 data-anim className="text-title-lg">
          Salvos para provar
        </h1>
        <p data-anim className="mt-1 text-body-sm text-ink-muted">
          Os produtos que você salvou, por loja. Reserve e prove na hora de retirar.
        </p>
      </div>

      <div ref={tela} className="flex flex-col gap-7">
        {salvos.tipo === 'carregando' && (
          <Carregando className="flex flex-col gap-3">
            <Esqueleto className="h-6 w-40" />
            <Esqueleto className="h-[104px]" />
            <Esqueleto className="h-[104px]" />
          </Carregando>
        )}

        {salvos.tipo === 'erro' && <ErroTela erro={salvos.erro} onTentar={salvos.recarregar} />}

        {salvos.tipo === 'ok' && grupos.length === 0 && (
          <Vazio>
            Você ainda não salvou nenhum produto. Toque no coração de um produto, na Capi ou numa loja, para guardar
            aqui.
          </Vazio>
        )}

        {grupos.map(({ loja, produtos }) => {
          const titulo = `salvos-${loja.id}`
          return (
            <section data-anim key={loja.id} aria-labelledby={titulo} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 id={titulo} className="text-title-sm">
                    <Link to={caminhoDaLoja(loja.id)} className="text-marrom-ink underline underline-offset-2">
                      {loja.nome}
                    </Link>
                  </h2>
                  <p className="text-body-sm text-ink-muted">
                    {nomeDoPiso(loja.piso)} · {produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'}
                  </p>
                </div>
                <Button
                  size="sm"
                  icon="mapa"
                  aria-describedby={titulo}
                  onClick={() => navigate(caminhoAteALoja(loja.mapaId))}
                >
                  Como chegar
                </Button>
              </div>
              <ul className="flex flex-col gap-3 md:grid md:grid-cols-2">
                {produtos.map((produto) => (
                  <li key={produto.id}>
                    <CartaoDoProduto
                      produto={produto}
                      semLinkDaLoja
                      acao="Reservar"
                      nomeDaAcao={`Reservar ${produto.nome}`}
                      onAcao={() => reservar(produto)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      {escolhido && <FolhaReserva produto={escolhido} aberta={folhaAberta} onFechar={() => setFolhaAberta(false)} />}
    </div>
  )
}
