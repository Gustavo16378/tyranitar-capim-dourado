# Como fazer uma tela de painel

O painel da loja (`/loja`: Atendimento, Reservas, Produtos, Cupons, Desempenho e Extrato) e o painel do shopping (`/shopping`: Lojas, Fidelidade e campanhas, Demanda, Lojas vagas e demanda, e Reembolsos) foram feitos pelo mesmo caminho e sobre a mesma base, em `src/painel/`. Este guia mostra esse caminho e onde está o exemplo de cada peça, para a próxima tela sair igual.

O caminho é sempre o mesmo, em seis passos: **tipos → função da rota → mock → tela → estados → animação**.

## Antes de começar

```bash
npm run dev            # http://localhost:5173/loja e http://localhost:5173/shopping
```

Enquanto a API não existe, quem responde são os mocks. Os dois painéis pedem login:

- **Loja:** qualquer e-mail no formato `lojista.loja-19@demo.test` e uma senha de 8 caracteres ou mais. No Atendimento, **Simular leitura** abre a carteira da Ana.
- **Shopping:** `admin@demo.test` e uma senha de 8 caracteres ou mais.

A barra lateral mostra o selo **Dados de exemplo** enquanto o painel usa mocks. Cada painel tem a sua sessão, então dá para abrir os dois em abas diferentes. Os dados de exemplo ficam na memória: recarregar a página volta tudo ao início.

## Onde fica cada coisa

```text
src/
├── tipos/
│   ├── comum.ts, usuario.ts, cupom.ts   os gerais, do app e dos painéis: erro, lista, nível,
│   │                         período, login e cupom
│   ├── loja.ts               1. tipos das rotas /api/loja (repete os gerais)
│   └── shopping.ts           1. tipos das rotas /api/shopping (repete os gerais)
├── painel/                   a base dos dois painéis
│   ├── painel.ts             ConfigDoPainel: nome, endereço, perfil, telas, sessão e login
│   ├── RotasDoPainel.tsx     login, guarda de perfil, barra lateral e rotas de qualquer painel
│   ├── TelaEntrar.tsx        o login
│   ├── layout/               barra lateral (LayoutPainel) e guarda de perfil (ExigirPerfil)
│   ├── api/
│   │   ├── http.ts           criarRequisitar(): token, JSON ou CSV, erros e desvio para os mocks
│   │   ├── sessao.ts         criarSessao(): o token de um painel
│   │   ├── useConsulta.ts    ler dados: carregando, erro, pronto (e atualizando)
│   │   └── useAcao.ts        enviar dados: enviando, erro e resultado
│   ├── comum/                CabecalhoTela, Estados, Campo, CampoLongo, Selecao, Opcao, Segmentos,
│   │                         Paginacao, useAdiado, useAgora, formatos, periodos, categorias
│   ├── cupons/               FormularioCupom e CartaoCupom: cupom da loja e voucher do shopping
│   └── graficos/             CartaoGrafico (com a tabela), GraficoRanking e as cores validadas
├── loja/  e  shopping/       cada painel, com a mesma forma:
│   ├── Rotas*.tsx            a ConfigDoPainel do painel (o App carrega sob demanda)
│   ├── navegacao.ts          a lista das telas: vira rota e item da barra lateral
│   ├── enderecos.ts          urlDaTela('vagas'): para uma tela levar a outra
│   ├── api/
│   │   ├── cliente.ts        o requisitar() e a sessão deste painel, com os mocks dele
│   │   ├── rotas.ts          2. uma função por rota da API
│   │   └── index.ts          o que as telas importam: rotas, useConsulta, useAcao, ErroApi
│   └── telas/<tela>/         4. uma pasta por tela
└── mocks/                    3. respostas de mentira, no formato da API
    ├── comum/                servidor de mentira, respostas, token falso, validação de cupom
    │                         e os armazéns que os dois painéis dividem: vouchers e reembolsos
    ├── loja/                 index.ts (ROTAS_MOCKADAS), dados.ts e um arquivo por recurso
    └── shopping/             idem, mais sugerirVagas.ts, a regra das vagas
```

Os componentes do design system (`Button`, `StatTile`, `CupomTicket`...) vêm de `src/componentes` e o movimento vem de `src/movimento`. Não crie componente novo se um destes resolve.

## Qual tela copiar

Cada tela tem, no topo do arquivo principal (`Tela<Nome>.tsx`), um mapa das partes e das rotas. Comece pela que mais parece com o que você precisa:

| Você precisa de | Copie de |
| --- | --- |
| Ler um código (QR) e mostrar o que a API devolve | Loja › Atendimento: `ClienteLido.tsx` |
| Formulário que envia e mostra o resultado | Loja › Atendimento: `RegistrarCompra.tsx` e `Recibo.tsx` |
| Valor calculado pela API enquanto a pessoa digita | Loja › Atendimento: `TotalDaCompra.tsx` |
| Lista com filtro, paginação e ação em cada item, com confirmação | Loja › Reservas |
| Busca enquanto digita, cadastro e edição com campos que mudam | Loja › Produtos; Shopping › Lojas |
| Enviar um arquivo (CSV) e mostrar os erros por linha | Loja › Produtos: `ImportarPlanilha.tsx` |
| Formulário com prévia ao vivo de um componente | `painel/cupons/FormularioCupom.tsx` (cupom e voucher) |
| Tabela de valores, paginada, com resumo no topo | Loja › Extrato |
| Uma coisa e as coisas dela (loja e seus lojistas) | Shopping › Lojas: `FormularioLoja.tsx` e `Lojistas.tsx` |
| Duas partes na mesma tela, uma de cada vez | Shopping › Fidelidade e campanhas |
| Ação em lote que não volta atrás | Shopping › Reembolsos: `CartaoDaLoja.tsx` |
| Gráficos | Loja › Desempenho; Shopping › Demanda e Lojas vagas e demanda |
| Uma regra de negócio que a API vai portar | `mocks/shopping/sugerirVagas.ts` (pura e testada) |

## Passo a passo

O exemplo monta a **Jornada** (RF30), a tela que falta no painel do shopping: quantas reservas viraram retirada e quantos atendimentos com ficha viraram venda. A rota `GET /api/shopping/jornada` está em `docs/api.md`, sem formato ainda.

### 1. Tipos

Em `src/tipos/shopping.ts` (ou `loja.ts`, numa tela da loja), escreva o corpo do pedido e da resposta da rota, com os nomes de `docs/api.md`: valores em centavos, datas em ISO 8601, nível em maiúsculas (`'CAPIM'`). Quando o contrato não detalha um campo, escreva a sua proposta e **registre-a em `docs/api.md`**, como foi feito com todas as rotas dos dois painéis.

```ts
export interface Jornada {
  periodo: Periodo
  reservas: { feitas: number; retiradas: number }
  atendimentos: { comFicha: number; comFichaQueViraramVenda: number }
  gastoMedioPorClienteCentavos: number
}
```

### 2. Função da rota

Em `src/shopping/api/rotas.ts`, uma função por rota. A tela nunca chama `fetch` direto: o `requisitar()` do painel (`api/cliente.ts`) põe o token, manda JSON (ou o texto que você passar em `texto`, como o CSV da importação de produtos) e transforma qualquer erro em `ErroApi`.

```ts
/** GET /api/shopping/jornada: reservas que viraram retirada e atendimentos que viraram venda (RF30). */
export function buscarJornada(periodo: Periodo, sinal?: AbortSignal) {
  return requisitar<Jornada>('GET', '/api/shopping/jornada', { busca: { periodo }, sinal })
}
```

No painel da loja, nunca mande o `lojaId` no corpo nem na URL: a API usa o do token, e um id de outra loja dá `403`.

### 3. Mock

Crie `src/mocks/shopping/jornada.ts` respondendo exatamente como a API: o mesmo corpo de sucesso e os erros no formato `{ status, erro, mensagem }`. Use os ajudantes de `mocks/comum/resposta.ts` e confira o perfil (`exigirAdmin` no shopping, `exigirLojista` na loja). Os dados ficam em `dados.ts`, dentro de `estadoInicial()`, para o `reiniciarMocks()` dos testes voltá-los ao começo.

```ts
export function buscarJornada(pedido: PedidoMock): RespostaMock {
  const negado = exigirAdmin(pedido)
  if (negado) return negado
  const periodo = lerPeriodo(pedido)
  if (!periodo) return dadosInvalidos('Use periodo 7d, 30d ou 90d.')
  const jornada: Jornada = { periodo, reservas: { feitas: 412, retiradas: 287 }, atendimentos: { comFicha: 190, comFichaQueViraramVenda: 141 }, gastoMedioPorClienteCentavos: 31240 }
  return ok(jornada)
}
```

E acrescente uma linha em `ROTAS_MOCKADAS`, no `src/mocks/shopping/index.ts`:

```ts
'GET /api/shopping/jornada': buscarJornada,
```

Pronto: `buscarJornada()` já responde, com 350 ms de atraso para você ver o estado de carregando. Escreva também um teste em `tests/unidade/` (veja `shopping-demanda.test.ts`) conferindo o formato e as regras. É ele que garante que a troca pela API real não vai quebrar a tela. Os testes rodam sem JSX: no código que eles importam, use `componentes/formatar` e `componentes/nivel`, não o índice `componentes`.

**Dados que os dois painéis dividem.** O voucher criado no shopping vale no Atendimento da loja, e o voucher usado no caixa vira reembolso no shopping e no Extrato da loja. Esses dados ficam em `mocks/comum/vouchers.ts` e `mocks/comum/reembolsos.ts`; o resto, em cada painel. Os testes `shopping-fidelidade` e `shopping-reembolsos` mostram os dois painéis conversando.

**Regra de negócio no mock.** Se a tela precisa de uma regra que a API vai ter (como a sugestão de loja para cada vaga), escreva-a como função pura no mock, com teste, e descreva-a em `docs/api.md` para a API portar igual (`mocks/shopping/sugerirVagas.ts`).

### 4. A tela

Cada tela é uma pasta em `src/<painel>/telas/<tela>/`, com o arquivo `Tela<Nome>.tsx` e um arquivo por bloco. Registre a tela com uma linha em `src/<painel>/navegacao.ts`: a rota e o item da barra lateral aparecem sozinhos. Tela com biblioteca pesada (gráficos com recharts) vai com `lazy`, como Desempenho, Demanda e Lojas vagas: ela só é baixada quando alguém abre a tela.

A tela sempre começa assim:

```tsx
export function TelaJornada() {
  const ref = useEntrada<HTMLDivElement>()
  const [periodo, setPeriodo] = useState<Periodo>('30d')
  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela titulo="Jornada" descricao="Quantas reservas viram retirada e quantos atendimentos com ficha viram venda." />
      <div data-anim>
        <Segmentos rotulo="Período da jornada" opcoes={PERIODOS} valor={periodo} aoMudar={setPeriodo} />
      </div>
      <div data-anim>
        <ConteudoDaJornada periodo={periodo} />
      </div>
    </div>
  )
}
```

O `CabecalhoTela` já põe o título da aba do navegador (com o nome do painel) e o `data-anim` do cabeçalho. Números do topo (`StatTile`) e a ação principal da tela (`Button variant="primary"`) entram como filhos dele.

### 5. Os quatro estados

Toda tela prevê carregando, vazio, erro e com dados (`docs/telas.md`). Quem busca é o `useConsulta`, que devolve um estado de cada vez:

```tsx
function ConteudoDaJornada({ periodo }: { periodo: Periodo }) {
  // useCallback: quando o período muda, a consulta refaz sozinha.
  const buscar = useCallback((sinal: AbortSignal) => buscarJornada(periodo, sinal), [periodo])
  const consulta = useConsulta(buscar)

  if (consulta.estado === 'carregando') {
    return (
      <Carregando rotulo="Carregando a jornada" className="flex flex-wrap gap-3">
        <Esqueleto className="h-[124px] w-[200px]" />
        <Esqueleto className="h-[124px] w-[200px]" />
      </Carregando>
    )
  }
  if (consulta.estado === 'erro') {
    const { erro, recarregar } = consulta
    return <Erro erro={erro} aoTentarDeNovo={erro.passageiro ? recarregar : undefined} />
  }
  if (!consulta.dados.reservas.feitas) return <Vazio>Nenhuma reserva neste período. Tente um período maior.</Vazio>
  return <Jornada jornada={consulta.dados} atualizando={consulta.atualizando} />
}
```

- **Carregando:** `Esqueleto` no formato do conteúdo, parado. Nada pisca nem pulsa. Só aparece na primeira carga.
- **Atualizando:** quando o filtro, a página ou o período mudam, os dados anteriores continuam na tela com `atualizando: true`. Deixe-os mais claros (`opacity-60` e `aria-busy`), sem esqueleto e sem a página pular.
- **Vazio:** uma frase curta dizendo o que fazer.
- **Erro:** a `mensagem` da API já vem pronta para o usuário. Só ofereça "Tentar de novo" quando adianta (`erro.passageiro`: sem conexão ou erro do servidor).
- **Busca enquanto digita:** passe o texto pelo `useAdiado` antes de pôr no `useCallback`, para não chamar a API a cada tecla (`ListaDeProdutos.tsx`, `ListaDeLojas.tsx`).
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

Depois de uma ação, anuncie o resultado numa linha com `role="status"` e recarregue a lista (`consulta.recarregar()`). Ação que não volta atrás (cancelar uma reserva, liberar uma unidade, pagar um reembolso) pede confirmação antes (`CartaoReserva.tsx`, `CartaoDaLoja.tsx`).

**Formulários:** `Campo` (texto, com prefixo como "R$"), `CampoLongo` (várias linhas), `Selecao` (lista) e `Opcao` (caixa de marcar e rádio), todos com rótulo, 16 px e 44 px de altura. Dinheiro digitado vira centavos com `lerValorEmCentavos`. Leia o formulário numa função `ler()` que devolve `{ pedido }` ou `{ erros }` por campo, e mande o pedido só quando não houver erro (`FormularioProduto.tsx`, `FormularioCupom.tsx`). Os erros da API aparecem no `Erro` acima do botão de enviar.

### 6. Animação de entrada

A tela entra em cascata: cada elemento com `data-anim` dentro do `ref` do `useEntrada` sobe 24 px e aparece, 60 ms depois do anterior. Com `prefers-reduced-motion`, vira só um fade. O preset já cuida disso.

- Marque com `data-anim` os blocos de primeiro nível: o cabeçalho (o `CabecalhoTela` já marca), o filtro e o conteúdo.
- **Bloco que chega depois** (a lista que aparece quando os dados chegam, o formulário que abre num clique) tem o próprio `useEntrada`, como `Reservas` em `ListaDeReservas.tsx` e o `FormularioCupom`. Como ele monta depois da tela, não anima duas vezes.
- **Não ponha `data-anim` num bloco que já existe quando a tela monta e que está dentro de outro bloco com `useEntrada`.** Ele seria animado pelos dois.
- Os outros movimentos da marca estão em `src/movimento`. `somarPontos` é o do recibo; `encherBarra` serve para barras de progresso. Anime só quando algo chega, se soma ou é conquistado.

## Gráficos

Desempenho (loja), Demanda e Lojas vagas e demanda (shopping) são os exemplos. Eles seguem a skill de visualização de dados:

- **A forma primeiro.** Um número sozinho é `StatTile`, não gráfico. Comparar itens é barra horizontal ranqueada, do maior para o menor (`painel/graficos/GraficoRanking.tsx`). Como um todo se divide em até 6 partes é a barra segmentada alta, de 28 px (`BarraDasReservas.tsx`). Nada de pizza ou rosca.
- **Cores só de tokens**, em `painel/graficos/cores.ts`, com o resultado do validador de paleta anotado. Série única é um tom só (`ouro`), sem legenda: o título diz o que é. Quando uma parte é o assunto e o resto é fundo, use o modo de destaque do `GraficoRanking` (`destaque` em cada linha e `legenda`): ouro contra `line`, com legenda. Cor que significa estado (`cerrado`, `perigo`) só quando a parte é mesmo um estado.
- **Marcas finas:** barra de até 24 px, ponta arredondada de 4 px, reta na linha de base, e 2 px da superfície entre blocos. O número vai na ponta da barra; o texto nunca usa a cor da série.
- **Tooltip em toda barra**, com o valor na frente e o nome depois. O recharts já dá a navegação por teclado (`accessibilityLayer`).
- **Tabela de todo gráfico:** o `CartaoGrafico` recebe a `tabela` e mostra "Ver em tabela", o equivalente sem cor e sem hover.
- **Sem a animação do recharts** (`isAnimationActive={false}`): a entrada é a cascata do GSAP, que respeita o movimento reduzido.
- **Filtro numa linha acima de tudo o que ele muda** (`Segmentos` com `PERIODOS`), e trocar o filtro mantém o gráfico anterior mais claro até o novo chegar.
- **A planta.** `shopping/telas/vagas/plantas.ts` lê `src/mapa/piso-*.svg` com `import.meta.glob` e devolve lista vazia se as plantas não estiverem no projeto: a tela funciona sem elas. Para marcar lojas na planta, use os polígonos (o `id` é o `mapa_id`) e ponha os marcadores em HTML por cima, com `espalhar()` para os vizinhos não se sobreporem.

## Regras do design system

- Cores, fontes, espaços, raios e sombras só dos tokens: `bg-surface-raised`, `text-ink-muted`, `rounded-md`, `p-5`, `shadow-card`. Nenhum hex, nem fonte fora de Fraunces e Figtree (até em `<code>`, use `font-sans`).
- Texto pelos estilos: `text-title-lg` (título da tela, o `CabecalhoTela` já usa), `text-title-sm` (título de cartão), `text-body`, `text-body-sm`, `text-label`, `text-caption`, `text-price` e `text-metric`.
- `marrom` é ação, `ouro` é marca e conquista, `cerrado` é confirmação, `aviso` é prazo correndo e `perigo` é erro.
- No máximo um `Button variant="primary"` por tela: na lista, a ação principal do cabeçalho ("Novo produto"); com o formulário aberto, o botão de salvar, e o do cabeçalho some; com duas partes na tela, uma de cada vez (Fidelidade). Confirmar uma venda ou um pagamento usa `variant="confirm"`; cancelar ou liberar, `variant="danger"`.
- Estado sempre com palavra ou ícone, nunca só com cor (`Badge` com texto, `ROTULO_DO_STATUS`, "Esgotado", "Vence em 3 dias", "Tamanho ideal").
- Alvo de toque com 44 px (`h-11`, `min-h-11`), foco visível (o anel do `focus-ring` já é global).
- Textos em português, curtos, sem ponto de exclamação e sem "Ops". O erro diz o que aconteceu e o que fazer.
- O vendedor nunca vê a conversa do cliente com a Capi, só a ficha; o shopping nunca vê quem buscou (RN12).

## Um painel novo

Um painel é uma `ConfigDoPainel` (`src/painel/painel.ts`) entregue ao `RotasDoPainel`: nome, endereço, perfil que entra, lista de telas, sessão, login e a dica de login dos mocks. Veja `src/shopping/RotasShopping.tsx`: com `api/cliente.ts` (o `criarRequisitar` e o `criarSessao` com uma chave nova), `navegacao.ts`, `enderecos.ts` e uma linha no `App.tsx`, o painel já tem login, guarda, barra lateral e título das abas.

## Trocar o mock pela API real

Quando a rota existir em `functions/`:

1. Apague a linha dela em `ROTAS_MOCKADAS` (`src/mocks/<painel>/index.ts`) e o manipulador, se ninguém mais usa.
2. Rode `npm run dev:api` e, em outro terminal, `npm run dev`, e confira a tela.
3. Se a resposta real vier diferente do tipo, corrija o tipo em `src/tipos/` e o registro em `docs/api.md`. A tela não muda.

Troque o **login primeiro**. As rotas mockadas aceitam o token real, mas a API real recusa o token do mock.

Para testar um painel inteiro contra a API real, desligue os mocks dele:

```bash
VITE_LOJA_MOCKS=0 npm run dev                     # bash (painel do shopping: VITE_SHOPPING_MOCKS=0)
$env:VITE_LOJA_MOCKS='0'; npm run dev             # PowerShell
```

Quando a tabela de um painel ficar vazia, apague a pasta dele em `src/mocks/` e ponha `mocksLigados: false` no `api/cliente.ts` do painel. `src/mocks/comum/` sai quando os dois painéis estiverem na API real.

## Antes do commit

- [ ] A tela tem os quatro estados: carregando, vazio, erro e com dados, e não volta ao esqueleto ao trocar filtro.
- [ ] Toda chamada passa por uma função de `src/<painel>/api/rotas.ts`, com mock enquanto a API não existe.
- [ ] O mock responde no formato de `docs/api.md`, o formato novo está registrado lá, e há teste em `tests/unidade/`.
- [ ] Só componentes de `src/componentes` e classes de token; um único botão primário.
- [ ] Funciona no celular (a barra lateral vira faixa no topo) e no tema escuro.
- [ ] Biblioteca pesada só na tela que usa, com `lazy` em `navegacao.ts`.
- [ ] `npm run lint`, `npm test` e `npm run build` passam.
- [ ] Um commit por assunto: `feat(shopping): tela de jornada`, `test(shopping): mock da jornada`.
