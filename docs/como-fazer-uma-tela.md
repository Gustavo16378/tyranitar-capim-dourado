# Como fazer uma tela do painel

As cinco telas do painel da loja (Atendimento, Reservas, Produtos, Cupons e Desempenho) foram feitas pelo mesmo caminho. Este guia mostra esse caminho e onde está o exemplo de cada peça, para a próxima tela sair igual: o Extrato da loja (RF25) ou as telas do painel do shopping.

O caminho é sempre o mesmo, em seis passos: **tipos → função da rota → mock → tela → estados → animação**.

## Antes de começar

```bash
npm run dev            # abre em http://localhost:5173/loja
```

O painel pede login. Enquanto a API não existe, quem responde são os mocks: entre com qualquer e-mail no formato `lojista.loja-19@demo.test` e uma senha de 8 caracteres ou mais. A barra lateral mostra o selo **Dados de exemplo** enquanto houver rota respondendo pelo mock. No Atendimento, **Simular leitura** abre a carteira da Ana.

Os dados de exemplo ficam na memória: recarregar a página volta tudo ao início.

## Onde fica cada coisa

```text
src/
├── tipos/loja.ts                 1. tipos de cada rota, no formato de docs/api.md
├── loja/
│   ├── RotasLoja.tsx             rotas de /loja (o App carrega sob demanda)
│   ├── navegacao.ts              lista das telas: vira rota e item da barra lateral
│   ├── enderecos.ts              urlDaTela('reservas'): para uma tela levar a outra
│   ├── api/
│   │   ├── rotas.ts              2. uma função por rota da API
│   │   ├── http.ts               requisitar(): token, JSON ou CSV, erros e desvio para os mocks
│   │   ├── useConsulta.ts        ler dados: carregando, erro, pronto (e atualizando)
│   │   ├── useAcao.ts            enviar dados: enviando, erro e resultado
│   │   └── sessao.ts             token do lojista
│   ├── comum/                    peças que toda tela usa
│   │   ├── CabecalhoTela.tsx     título, descrição, ações e o <title> da aba
│   │   ├── Estados.tsx           Carregando, Esqueleto, Vazio e Erro
│   │   ├── Campo, CampoLongo, Selecao, Opcao   campos de formulário
│   │   ├── Segmentos.tsx         filtro de uma escolha (status, período)
│   │   ├── Paginacao.tsx         anterior e próxima de uma lista { itens, total }
│   │   ├── useAdiado.ts          espera a pessoa parar de digitar
│   │   ├── useAgora.ts           relógio para prazos ("Expira em 40 min")
│   │   ├── formatos.ts           dinheiro, datas em Palmas, nível
│   │   └── reserva.ts            transições e rótulos do status da reserva
│   ├── layout/                   barra lateral e guarda de login
│   └── telas/
│       ├── atendimento/  reservas/  produtos/  cupons/  desempenho/
└── mocks/loja/                   3. respostas de mentira, no formato da API
    ├── index.ts                  ROTAS_MOCKADAS: uma linha por rota
    ├── dados.ts                  o "banco" do mock
    └── atendimento.ts, reservas.ts, produtos.ts, cupons.ts, relatorios.ts
```

Os componentes do design system (`Button`, `StatTile`, `CupomTicket`...) vêm de `src/componentes` e o movimento vem de `src/movimento`. Não crie componente novo se um destes resolve.

## Qual tela copiar

Cada tela tem, no topo do arquivo principal (`Tela<Nome>.tsx`), um mapa das partes e das rotas. Comece pela que mais parece com o que você precisa:

| Você precisa de | Copie de |
| --- | --- |
| Ler um código (QR) e mostrar o que a API devolve | Atendimento: `ClienteLido.tsx` |
| Formulário que envia e mostra o resultado | Atendimento: `RegistrarCompra.tsx` e `Recibo.tsx` |
| Valor calculado pela API enquanto a pessoa digita | Atendimento: `TotalDaCompra.tsx` |
| Lista com filtro, paginação e ação em cada item, com confirmação | Reservas |
| Busca enquanto digita, cadastro e edição com campos que mudam | Produtos |
| Enviar um arquivo (CSV) e mostrar os erros por linha | Produtos: `ImportarPlanilha.tsx` |
| Formulário com prévia ao vivo de um componente | Cupons: `FormularioCupom.tsx` |
| Gráficos | Desempenho (veja também *Gráficos*, abaixo) |

## Passo a passo

O exemplo monta o **Extrato** da loja (RF25): vendas pela plataforma, desconto concedido em cupons e reembolsos a receber do shopping.

### 1. Tipos

Em `src/tipos/loja.ts`, escreva o corpo do pedido e da resposta da rota, copiando os nomes de `docs/api.md`: valores em centavos (`valorCentavos`), datas em ISO 8601, nível em maiúsculas (`'CAPIM'`). Quando o contrato não detalha um campo, escreva a sua proposta e registre-a em `docs/api.md`, como foi feito com as reservas, os produtos, os cupons e o relatório.

```ts
export interface Extrato {
  periodo: Periodo
  vendasCentavos: number
  descontoEmCuponsCentavos: number
  reembolsos: { id: string; cupom: string; centavos: number; status: 'PENDENTE' | 'PAGO' }[]
}
```

### 2. Função da rota

Em `src/loja/api/rotas.ts`, uma função por rota. A tela nunca chama `fetch` direto: `requisitar()` põe o token, manda JSON (ou o texto que você passar em `texto`, como o CSV da importação) e transforma qualquer erro em `ErroApi`.

```ts
/** GET /api/loja/extrato: vendas, descontos e reembolsos da loja no período (RF25). */
export function buscarExtrato(periodo: Periodo, sinal?: AbortSignal) {
  return requisitar<Extrato>('GET', '/api/loja/extrato', { busca: { periodo }, sinal })
}
```

Nunca mande o `lojaId` no corpo nem na URL: a API usa o do token, e um id de outra loja dá 403.

### 3. Mock

Crie `src/mocks/loja/extrato.ts` respondendo exatamente como a API: o mesmo corpo de sucesso e os erros no formato `{ status, erro, mensagem }`. Use os ajudantes de `resposta.ts` e confira o perfil com `exigirLojista`. Os dados ficam em `dados.ts`, dentro de `estadoInicial()`, para o `reiniciarMocks()` dos testes voltá-los ao começo.

```ts
export function buscarExtrato(pedido: PedidoMock): RespostaMock {
  const negado = exigirLojista(pedido)
  if (negado) return negado
  const periodo = pedido.busca.get('periodo') ?? '30d'
  if (!['7d', '30d', '90d'].includes(periodo)) return dadosInvalidos('Use periodo 7d, 30d ou 90d.')
  const extrato: Extrato = { periodo: periodo as Periodo, vendasCentavos: 1284000, descontoEmCuponsCentavos: 70440, reembolsos: [] }
  return ok(extrato)
}
```

E acrescente uma linha em `ROTAS_MOCKADAS`, no `src/mocks/loja/index.ts`:

```ts
'GET /api/loja/extrato': buscarExtrato,
```

Pronto: `buscarExtrato()` já responde, com 350 ms de atraso para você ver o estado de carregando. Escreva também um teste em `tests/unidade/` (veja `loja-mocks.test.ts` ou `loja-produtos.test.ts`) conferindo o formato e as regras. É ele que garante que a troca pela API real não vai quebrar a tela. Os testes rodam sem JSX: no código que eles importam, use `componentes/formatar` e `componentes/nivel`, não o índice `componentes`.

### 4. A tela

Cada tela é uma pasta em `src/loja/telas/<tela>/`, com o arquivo `Tela<Nome>.tsx` e um arquivo por bloco. Registre a tela com uma linha em `src/loja/navegacao.ts`: a rota e o item da barra lateral aparecem sozinhos. Se a tela traz uma biblioteca pesada (como o recharts no Desempenho), registre-a com `lazy`, como o Desempenho já está: ela só é baixada quando alguém abre a tela.

A tela sempre começa assim:

```tsx
export function TelaExtrato() {
  const ref = useEntrada<HTMLDivElement>()
  const [periodo, setPeriodo] = useState<Periodo>('30d')
  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela titulo="Extrato" descricao="O que a loja vendeu pela plataforma e o que o shopping deve a ela." />
      <div data-anim>
        <Segmentos rotulo="Período do extrato" opcoes={PERIODOS} valor={periodo} aoMudar={setPeriodo} />
      </div>
      <div data-anim>
        <ConteudoDoExtrato periodo={periodo} />
      </div>
    </div>
  )
}
```

O `CabecalhoTela` já põe o título da aba do navegador e o `data-anim` do cabeçalho. Números do topo (`StatTile`) e a ação principal da tela (`Button variant="primary"`) entram como filhos dele.

### 5. Os quatro estados

Toda tela prevê carregando, vazio, erro e com dados (`docs/telas.md`). Quem busca é o `useConsulta`, que devolve um estado de cada vez:

```tsx
function ConteudoDoExtrato({ periodo }: { periodo: Periodo }) {
  // useCallback: quando o período muda, a consulta refaz sozinha.
  const buscar = useCallback((sinal: AbortSignal) => buscarExtrato(periodo, sinal), [periodo])
  const consulta = useConsulta(buscar)

  if (consulta.estado === 'carregando') {
    return (
      <Carregando rotulo="Carregando o extrato" className="flex flex-col gap-3">
        <Esqueleto className="h-[124px]" />
        <Esqueleto className="h-[240px]" />
      </Carregando>
    )
  }
  if (consulta.estado === 'erro') {
    const { erro, recarregar } = consulta
    return <Erro erro={erro} aoTentarDeNovo={erro.passageiro ? recarregar : undefined} />
  }
  if (!consulta.dados.vendasCentavos) return <Vazio>Nenhuma venda pela plataforma neste período.</Vazio>
  return <Extrato extrato={consulta.dados} atualizando={consulta.atualizando} />
}
```

- **Carregando:** `Esqueleto` no formato do conteúdo, parado. Nada pisca nem pulsa. Só aparece na primeira carga.
- **Atualizando:** quando o filtro, a página ou o período mudam, os dados anteriores continuam na tela com `atualizando: true`. Deixe-os mais claros (`opacity-60` e `aria-busy`), sem esqueleto e sem a página pular. Veja `ListaDeReservas.tsx`.
- **Vazio:** uma frase curta dizendo o que fazer.
- **Erro:** a `mensagem` da API já vem pronta para o usuário. Só ofereça "Tentar de novo" quando adianta (`erro.passageiro`: sem conexão ou erro do servidor).
- **Busca enquanto digita:** passe o texto pelo `useAdiado` antes de pôr no `useCallback`, para não chamar a API a cada tecla (`ListaDeProdutos.tsx`, `TotalDaCompra.tsx`).
- Uma função de busca que não depende de nada pode ficar fora do componente, sem `useCallback`: `useConsulta(listarCupons)`.

Para **enviar** (criar, editar, mudar status), use o `useAcao`. Ele nunca lança erro: devolve o resultado, ou `null` com o erro guardado em `erro`.

```tsx
const mudar = useAcao(mudarStatusReserva)
async function aplicar(status: StatusPedidoPelaLoja) {
  const atualizada = await mudar.executar(reserva.id, status)
  if (atualizada) aoMudar(atualizada, 'Reserva confirmada')
}
// <Button disabled={mudar.enviando} ...>   {mudar.erro && <Erro erro={mudar.erro} />}
```

Depois de uma ação, anuncie o resultado numa linha com `role="status"` e recarregue a lista (`consulta.recarregar()`). Ação destrutiva (cancelar) pede confirmação antes, com `Button variant="danger"` (`CartaoReserva.tsx`).

**Formulários:** `Campo` (texto, com prefixo como "R$"), `CampoLongo` (várias linhas), `Selecao` (lista) e `Opcao` (caixa de marcar e rádio), todos com rótulo, 16 px e 44 px de altura. Dinheiro digitado vira centavos com `lerValorEmCentavos`. Leia o formulário numa função `ler()` que devolve `{ pedido }` ou `{ erros }` por campo, e mande o pedido só quando não houver erro (`FormularioProduto.tsx`, `FormularioCupom.tsx`). Os erros da API aparecem no `Erro` acima do botão de enviar.

### 6. Animação de entrada

A tela entra em cascata: cada elemento com `data-anim` dentro do `ref` do `useEntrada` sobe 24 px e aparece, 60 ms depois do anterior. Com `prefers-reduced-motion`, vira só um fade. O preset já cuida disso.

- Marque com `data-anim` os blocos de primeiro nível: o cabeçalho (o `CabecalhoTela` já marca), o filtro e o conteúdo.
- **Bloco que chega depois** (a lista que aparece quando os dados chegam, o formulário que abre num clique) tem o próprio `useEntrada`, como `Reservas` em `ListaDeReservas.tsx` e o `FormularioCupom`. Como ele monta depois da tela, não anima duas vezes.
- **Não ponha `data-anim` num bloco que já existe quando a tela monta e que está dentro de outro bloco com `useEntrada`.** Ele seria animado pelos dois.
- Os outros movimentos da marca estão em `src/movimento`. `somarPontos` é o do recibo; `encherBarra` serve para barras de progresso. Anime só quando algo chega, se soma ou é conquistado.

## Gráficos

O Desempenho é o exemplo. Ele segue a skill de visualização de dados:

- **A forma primeiro.** Um número sozinho é `StatTile`, não gráfico. Comparar itens é barra horizontal ranqueada, do maior para o menor (`GraficoRanking.tsx`). Como um todo se divide em até 6 partes é a barra segmentada alta, de 28 px (`BarraDasReservas.tsx`). Nada de pizza ou rosca.
- **Cores só de tokens**, em `cores.ts`, com o resultado do validador de paleta anotado. Série única é um tom só (`ouro`), sem legenda: o título diz o que é. Cor que significa estado (`cerrado`, `perigo`) só quando a parte é mesmo um estado, sempre com nome na legenda.
- **Marcas finas:** barra de até 24 px, ponta arredondada de 4 px, reta na linha de base, e 2 px da superfície entre blocos. O número vai na ponta da barra; o texto nunca usa a cor da série.
- **Tooltip em toda barra**, com o valor na frente e o nome depois. O recharts já dá a navegação por teclado (`accessibilityLayer`).
- **Tabela de todo gráfico:** o `CartaoGrafico` recebe a `tabela` e mostra "Ver em tabela", o equivalente sem cor e sem hover.
- **Sem a animação do recharts** (`isAnimationActive={false}`): a entrada é a cascata do GSAP, que respeita o movimento reduzido.
- **Filtro numa linha acima de tudo o que ele muda**, e trocar o filtro mantém o gráfico anterior mais claro até o novo chegar.

## Regras do design system

- Cores, fontes, espaços, raios e sombras só dos tokens: `bg-surface-raised`, `text-ink-muted`, `rounded-md`, `p-5`, `shadow-card`. Nenhum hex, nem fonte fora de Fraunces e Figtree (até em `<code>`, use `font-sans`).
- Texto pelos estilos: `text-title-lg` (título da tela, o `CabecalhoTela` já usa), `text-title-sm` (título de cartão), `text-body`, `text-body-sm`, `text-label`, `text-caption`, `text-price` e `text-metric`.
- `marrom` é ação, `ouro` é marca e conquista, `cerrado` é confirmação, `aviso` é prazo correndo e `perigo` é erro.
- No máximo um `Button variant="primary"` por tela: na lista, a ação principal do cabeçalho ("Novo produto"); com o formulário aberto, o botão de salvar, e o do cabeçalho some. Confirmar uma venda usa `variant="confirm"`; cancelar, `variant="danger"`.
- Estado sempre com palavra ou ícone, nunca só com cor (`Badge` com texto, `ROTULO_DO_STATUS`, "Esgotado", "Vence em 3 dias").
- Alvo de toque com 44 px (`h-11`, `min-h-11`), foco visível (o anel do `focus-ring` já é global).
- Textos em português, curtos, sem ponto de exclamação e sem "Ops". O erro diz o que aconteceu e o que fazer.
- O vendedor nunca vê a conversa do cliente com a Capi, só a ficha.

## Trocar o mock pela API real

Quando a rota existir em `functions/`:

1. Apague a linha dela em `ROTAS_MOCKADAS` (`src/mocks/loja/index.ts`) e o manipulador, se ninguém mais usa.
2. Rode `npm run dev:api` e, em outro terminal, `npm run dev`, e confira a tela.
3. Se a resposta real vier diferente do tipo, corrija o tipo em `src/tipos/loja.ts` e o registro em `docs/api.md`. A tela não muda.

Troque o **login primeiro**. As rotas mockadas aceitam o token real, mas a API real recusa o token do mock.

Para testar tudo contra a API real de uma vez, desligue os mocks:

```bash
VITE_LOJA_MOCKS=0 npm run dev                    # bash
$env:VITE_LOJA_MOCKS='0'; npm run dev            # PowerShell
```

Quando a tabela ficar vazia, apague `src/mocks/loja/` e o bloco `if (MOCKS_LIGADOS)` do `src/loja/api/http.ts`.

## Antes do commit

- [ ] A tela tem os quatro estados: carregando, vazio, erro e com dados, e não volta ao esqueleto ao trocar filtro.
- [ ] Toda chamada passa por uma função de `src/loja/api/rotas.ts`, com mock enquanto a API não existe.
- [ ] O mock responde no formato de `docs/api.md`, o formato novo está registrado lá, e há teste em `tests/unidade/`.
- [ ] Só componentes de `src/componentes` e classes de token; um único botão primário.
- [ ] Funciona no celular (a barra lateral vira faixa no topo) e no tema escuro.
- [ ] Biblioteca pesada só na tela que usa, com `lazy` em `navegacao.ts`.
- [ ] `npm run lint`, `npm test` e `npm run build` passam.
- [ ] Um commit por assunto: `feat(loja): tela de extrato`, `test(loja): mock do extrato`.
