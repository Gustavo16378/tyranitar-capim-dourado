import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { obterProduto, useDados } from '../api'
import { Badge, Button, formatarPreco, Icon } from '../componentes'
import { APP_NOME } from '../config'
import { useEntrada } from '../movimento'
import type { ProdutoDetalhe } from '../tipos'
import { AvisoDemonstracao } from './AvisoDemonstracao'
import { BotaoSalvar } from './BotaoSalvar'
import { caminhoDaLoja } from './caminhos'
import { Carregando, ErroTela, Esqueleto } from './Estados'
import { FolhaReserva } from './FolhaReserva'
import { nomeDoPiso } from './formatos'

/** A API manda primeiro o mesmo item (mesmo nome) e depois os parecidos da mesma categoria. */
function mesmoItem(nome: string, outro: string) {
  return nome.localeCompare(outro, 'pt-BR', { sensitivity: 'accent' }) === 0
}

function SeloEstoque({ estoque }: { estoque: number }) {
  if (estoque === 0)
    return (
      <Badge tone="perigo" icon="alerta">
        Esgotado nesta loja
      </Badge>
    )
  if (estoque <= 2)
    return (
      <Badge tone="aviso" icon="relogio">
        {estoque === 1 ? 'Última unidade' : `Últimas ${estoque} unidades`}
      </Badge>
    )
  return <Badge icon="check">Em estoque</Badge>
}

/** Foto do produto, ou a espiral no lugar quando a loja ainda não mandou foto. */
function Foto({ produto }: { produto: ProdutoDetalhe }) {
  const foto = produto.fotos[0] ?? produto.foto
  return (
    <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-md bg-surface-sunken">
      {foto ? (
        <img src={foto} alt={produto.nome} className="size-full object-cover" />
      ) : (
        <>
          <svg
            viewBox="0 0 120 90"
            aria-hidden="true"
            fill="none"
            strokeWidth={1.5}
            className="w-[55%] stroke-line-strong"
          >
            <path d="M60 45m-8 0a8 8 0 1 0 16 0a16 16 0 1 0-32 0a24 24 0 1 0 48 0" />
          </svg>
          <span className="absolute bottom-2 right-3 text-caption text-ink-muted">Foto do produto</span>
        </>
      )}
    </div>
  )
}

/** Produto: loja, piso, preço, estoque, outras lojas com o item e o botão de reservar. */
export default function Produto() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const produto = useDados(() => obterProduto(id), id)
  const [folhaAberta, setFolhaAberta] = useState(false)
  const tela = useEntrada<HTMLDivElement>([produto.tipo === 'ok' ? id : ''])

  // Volta para onde o cliente estava (a Capi, o Início); se abriu o link direto, vai para o Início.
  const voltar = () => (location.key === 'default' ? navigate('/inicio') : navigate(-1))

  return (
    <div ref={tela} className="flex min-h-full flex-col gap-5 px-4 py-6">
      <button
        type="button"
        onClick={voltar}
        className="inline-flex cursor-pointer items-center gap-1 self-start border-0 bg-transparent py-1 text-label text-marrom-ink"
      >
        <Icon name="seta" className="size-4 -rotate-[135deg]" />
        Voltar
      </button>

      {/* Enquanto carrega, ou se der erro, a página tem título para o leitor de tela. */}
      {produto.tipo !== 'ok' && <h1 className="sr-only">Produto</h1>}

      {produto.tipo === 'carregando' && (
        <Carregando className="flex flex-col gap-5">
          <Esqueleto className="aspect-[4/3]" />
          <Esqueleto className="h-6 w-32" />
          <Esqueleto className="h-7 w-3/4" />
          <Esqueleto className="h-5 w-1/2" />
        </Carregando>
      )}

      {produto.tipo === 'erro' && (
        // Produto que não existe não volta tentando de novo.
        <ErroTela erro={produto.erro} onTentar={produto.erro.status === 404 ? undefined : produto.recarregar} />
      )}

      {produto.tipo === 'ok' && (
        <>
          <title>{`${produto.dados.nome} · ${APP_NOME}`}</title>
          <div data-anim>
            <Foto produto={produto.dados} />
          </div>

          <div data-anim className="flex flex-col items-start gap-2">
            <SeloEstoque estoque={produto.dados.estoque} />
            <div className="flex w-full items-start justify-between gap-3">
              <h1 className="text-title-md">{produto.dados.nome}</h1>
              <BotaoSalvar produto={produto.dados} />
            </div>
            <p className="flex items-center gap-1 text-body-sm text-ink-muted">
              <Icon name="pin" className="size-4" />
              <span>
                <Link
                  to={caminhoDaLoja(produto.dados.loja.id)}
                  className="text-marrom-ink underline underline-offset-2"
                >
                  {produto.dados.loja.nome}
                </Link>{' '}
                · {nomeDoPiso(produto.dados.loja.piso)}
              </span>
            </p>
            <p className="text-price">{formatarPreco(produto.dados.precoCentavos)}</p>
          </div>

          {produto.dados.outrasLojas.length > 0 && (
            <section data-anim aria-labelledby="titulo-outras" className="flex flex-col gap-3">
              <h2 id="titulo-outras" className="text-title-sm text-marrom-ink">
                Também no shopping
              </h2>
              <ul className="flex flex-col gap-2 md:grid md:grid-cols-2">
                {produto.dados.outrasLojas.map((outro) => (
                  <li key={outro.id}>
                    <Link
                      to={`/produto/${outro.id}`}
                      className="flex items-center justify-between gap-3 rounded-md border bg-surface-raised px-4 py-3"
                    >
                      <span>
                        <strong className="block text-label">{outro.loja.nome}</strong>
                        <span className="text-body-sm text-ink-muted">
                          {outro.nome} · {mesmoItem(outro.nome, produto.dados.nome) ? 'mesmo item' : 'parecido'}
                        </span>
                      </span>
                      <span className="whitespace-nowrap text-price">{formatarPreco(outro.precoCentavos)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div data-anim className="mt-auto flex gap-2">
            <Button icon="mapa" onClick={() => navigate(`/mapa?loja=${encodeURIComponent(produto.dados.loja.mapaId)}`)}>
              Mapa
            </Button>
            <Button variant="primary" block disabled={produto.dados.estoque === 0} onClick={() => setFolhaAberta(true)}>
              Reservar
            </Button>
          </div>

          <AvisoDemonstracao />

          <FolhaReserva produto={produto.dados} aberta={folhaAberta} onFechar={() => setFolhaAberta(false)} />
        </>
      )}
    </div>
  )
}
