import { useLocation, useNavigate, useParams } from 'react-router'
import { listarProdutos, obterLoja, useDados } from '../api'
import { Badge, Button, Icon } from '../componentes'
import { APP_NOME } from '../config'
import { useEntrada } from '../movimento'
import { rotuloDaCategoria } from '../painel/comum/categorias'
import { caminhoAteALoja } from './caminhos'
import { CartaoDoProduto } from './CartaoDoProduto'
import { Carregando, ErroTela, Esqueleto, Vazio } from './Estados'
import { nomeDoPiso } from './formatos'

/** Os produtos da loja de uma vez (a busca da API vai até 100 por página). */
const MAXIMO = 100

/**
 * A página da loja no app (/lojas/{id}; /loja é o painel do lojista): o nome, a categoria
 * principal, o piso, os produtos dela em grade (cada um com o coração) e "Como chegar".
 * Abre tocando no nome da loja no produto, nos cartões, nos salvos e no mapa.
 */
export default function PaginaDaLoja() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const loja = useDados(() => obterLoja(id), id)
  const produtos = useDados(() => listarProdutos({ loja: id, tamanho: MAXIMO }), id)
  const tela = useEntrada<HTMLDivElement>([loja.tipo === 'ok' ? id : ''])

  // Volta para onde o cliente estava; se abriu o link direto, vai para o Início.
  const voltar = () => (location.key === 'default' ? navigate('/inicio') : navigate(-1))

  return (
    <div ref={tela} className="flex flex-col gap-5 px-4 py-6">
      <button
        type="button"
        onClick={voltar}
        className="inline-flex cursor-pointer items-center gap-1 self-start border-0 bg-transparent py-1 text-label text-marrom-ink"
      >
        <Icon name="seta" className="size-4 -rotate-[135deg]" />
        Voltar
      </button>

      {loja.tipo !== 'ok' && <h1 className="sr-only">Loja</h1>}
      {loja.tipo === 'carregando' && (
        <Carregando className="flex flex-col gap-3">
          <Esqueleto className="h-8 w-2/3" />
          <Esqueleto className="h-5 w-1/3" />
        </Carregando>
      )}
      {loja.tipo === 'erro' && (
        // Loja que não existe (ou saiu do shopping) não volta tentando de novo.
        <ErroTela erro={loja.erro} onTentar={loja.erro.status === 404 ? undefined : loja.recarregar} />
      )}

      {loja.tipo === 'ok' && (
        <>
          <title>{`${loja.dados.nome} · ${APP_NOME}`}</title>
          <header data-anim className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col items-start gap-2">
              {loja.dados.categorias[0] && <Badge>{rotuloDaCategoria(loja.dados.categorias[0])}</Badge>}
              <h1 className="text-title-lg">{loja.dados.nome}</h1>
              <p className="flex items-center gap-1 text-body-sm text-ink-muted">
                <Icon name="pin" className="size-4" />
                {nomeDoPiso(loja.dados.piso)}
              </p>
            </div>
            <Button variant="primary" icon="mapa" onClick={() => navigate(caminhoAteALoja(loja.dados.mapaId))}>
              Como chegar
            </Button>
          </header>

          <section data-anim aria-labelledby="titulo-produtos-da-loja" className="flex flex-col gap-3">
            <h2 id="titulo-produtos-da-loja" className="text-title-sm text-marrom-ink">
              Produtos{produtos.tipo === 'ok' && produtos.dados.total > 0 ? ` (${produtos.dados.total})` : ''}
            </h2>
            {produtos.tipo === 'carregando' && (
              <Carregando className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Esqueleto className="h-56" />
                <Esqueleto className="h-56" />
              </Carregando>
            )}
            {produtos.tipo === 'erro' && <ErroTela erro={produtos.erro} onTentar={produtos.recarregar} />}
            {produtos.tipo === 'ok' &&
              (produtos.dados.itens.length === 0 ? (
                <Vazio>Esta loja ainda não tem produtos no app. Passe lá para conhecer.</Vazio>
              ) : (
                <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {produtos.dados.itens.map((produto) => (
                    <li key={produto.id} className="flex">
                      <CartaoDoProduto produto={produto} horizontal={false} semLinkDaLoja />
                    </li>
                  ))}
                </ul>
              ))}
          </section>
        </>
      )}
    </div>
  )
}
