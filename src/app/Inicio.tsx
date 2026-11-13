import { Link, useNavigate } from 'react-router'
import { listarFavoritos, listarOfertas, obterCarteira, useDados, useSessao } from '../api'
import { Button, CapiMark, CupomTicket, Icon, NivelBadge, ProdutoCard } from '../componentes'
import { APP_NOME } from '../config'
import { cx } from '../componentes/cx'
import { useEntrada } from '../movimento'
import { Carregando, ErroTela, Esqueleto, Vazio } from './Estados'
import { dataCurta, descontoDoCupom, nomeDoPiso, paraNivel, primeiroNome, saudacao } from './formatos'
import { SetasDoCarrossel } from './SetasDoCarrossel'
import { useCarrossel } from './useCarrossel'

/** Início: ofertas para o cliente, produtos salvos e o atalho para a Capi. */
export default function Inicio() {
  const navigate = useNavigate()
  const usuario = useSessao()?.usuario
  const ofertas = useDados(listarOfertas, 'ofertas')
  const favoritos = useDados(listarFavoritos, 'favoritos')
  const carteira = useDados(obterCarteira, 'carteira')
  const pronto = ofertas.tipo !== 'carregando' && favoritos.tipo !== 'carregando'
  // O topo entra na hora; as seções entram quando os dados chegam.
  const topo = useEntrada<HTMLDivElement>()
  const conteudo = useEntrada<HTMLDivElement>([pronto])
  const cupons = useCarrossel()

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <title>{`Início · ${APP_NOME}`}</title>
      <div ref={topo} className="flex flex-col gap-5">
        <header data-anim className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-body-sm text-ink-muted">
                {saudacao()}
                {usuario && `, ${primeiroNome(usuario.nome)}`}
              </p>
              {carteira.tipo === 'ok' && <NivelBadge nivel={paraNivel(carteira.dados.nivel)} />}
            </div>
            <h1 className="mt-1 text-title-lg">O que você procura hoje?</h1>
          </div>
          {/* O avatar abre a Minha conta. A partir de 768 px, quem faz isso é a barra lateral. */}
          <Link
            to="/conta"
            aria-label="Minha conta"
            className="grid size-11 flex-none place-items-center rounded-full bg-terra text-title-sm text-on-terra md:hidden"
          >
            <span aria-hidden="true">{usuario ? primeiroNome(usuario.nome).charAt(0).toUpperCase() : '?'}</span>
          </Link>
        </header>

        <Link
          data-anim
          to="/capi"
          className="flex w-full items-center gap-3 rounded-pill border border-line-strong bg-surface-raised py-2 pl-2 pr-4 text-ink-muted"
        >
          <span className="grid size-10 flex-none place-items-center rounded-full bg-terra">
            <CapiMark className="size-[26px]" />
          </span>
          <span className="flex-1">Pergunte à Capi ou mande uma foto</span>
          <Icon name="camera" />
        </Link>
      </div>

      <div ref={conteudo} className="flex flex-col gap-5">
        {!pronto ? (
          <Carregando className="flex flex-col gap-5">
            <Esqueleto className="h-6 w-40" />
            <div className="flex gap-3">
              <Esqueleto className="h-[104px] w-[300px] flex-none" />
              <Esqueleto className="h-[104px] w-[300px] flex-none" />
            </div>
            <Esqueleto className="h-6 w-32" />
            <Esqueleto className="h-[104px]" />
            <Esqueleto className="h-[104px]" />
          </Carregando>
        ) : (
          <>
            <section data-anim aria-labelledby="titulo-ofertas" className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 id="titulo-ofertas" className="text-title-sm text-marrom-ink">
                  Ofertas para você
                </h2>
                <div className="flex items-center gap-2">
                  <SetasDoCarrossel carrossel={cupons} anterior="Cupons anteriores" proximo="Próximos cupons" />
                  <Button variant="ghost" size="sm" onClick={() => navigate('/carteira')}>
                    Ver cupons
                  </Button>
                </div>
              </div>
              {ofertas.tipo === 'erro' && <ErroTela erro={ofertas.erro} onTentar={ofertas.recarregar} />}
              {ofertas.tipo === 'ok' &&
                (ofertas.dados.itens.length === 0 ? (
                  <Vazio>Nenhuma oferta para você agora. Volte amanhã.</Vazio>
                ) : (
                  // Focável para dar para rolar as ofertas pelo teclado (setas). No celular, o dedo
                  // desliza; no computador, setas, arrastar com o mouse e a roda (useCarrossel).
                  <div
                    {...cupons.faixa}
                    tabIndex={0}
                    role="region"
                    aria-label="Cupons em oferta"
                    className={cx(
                      'relative -mx-4 flex gap-3 overflow-x-auto px-4 pb-3 pt-2.5 [scrollbar-width:none]',
                      '[@media(pointer:fine)]:cursor-grab [@media(pointer:fine)]:select-none',
                      cupons.arrastando && '[@media(pointer:fine)]:cursor-grabbing',
                    )}
                  >
                    {ofertas.dados.itens.map((cupom) => (
                      // flex: o cupom estica até a altura do mais alto, sem buraco embaixo dos baixos.
                      <div key={cupom.id} className="flex w-[300px] flex-none">
                        <CupomTicket
                          origem={cupom.origem === 'SHOPPING' ? 'shopping' : 'loja'}
                          titulo={cupom.titulo}
                          loja={cupom.loja?.nome}
                          desconto={descontoDoCupom(cupom)}
                          validade={dataCurta(cupom.validade)}
                          nivel={cupom.nivelMinimo === 'SEMENTE' ? undefined : paraNivel(cupom.nivelMinimo)}
                        />
                      </div>
                    ))}
                  </div>
                ))}
            </section>

            <section aria-labelledby="titulo-salvos" className="flex flex-col gap-3">
              <h2 data-anim id="titulo-salvos" className="text-title-sm text-marrom-ink">
                Você salvou
              </h2>
              {favoritos.tipo === 'erro' && <ErroTela erro={favoritos.erro} onTentar={favoritos.recarregar} />}
              {favoritos.tipo === 'ok' &&
                (favoritos.dados.itens.length === 0 ? (
                  <Vazio>Você ainda não salvou nenhum produto. Pergunte à Capi.</Vazio>
                ) : (
                  <ul className="flex flex-col gap-3 md:grid md:grid-cols-2 xl:grid-cols-3">
                    {favoritos.dados.itens.map((p) => (
                      <li key={p.id} data-anim>
                        <Link to={`/produto/${p.id}`} className="block rounded-md">
                          <ProdutoCard
                            horizontal
                            nome={p.nome}
                            loja={p.loja.nome}
                            piso={nomeDoPiso(p.loja.piso)}
                            precoCentavos={p.precoCentavos}
                            estoque={p.estoque}
                            foto={p.foto ?? undefined}
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ))}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
