# Como fazer uma tela do painel

Este guia mostra como a tela de **Atendimento** do painel da loja foi montada, para você repetir o mesmo caminho nas telas que faltam: Reservas, Produtos, Cupons e Desempenho. Elas já existem como páginas vazias em `src/loja/telas/`, cada uma com um comentário no topo dizendo quais componentes, rotas e regras usar.

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
│   ├── api/
│   │   ├── rotas.ts              2. uma função por rota da API
│   │   ├── http.ts               requisitar(): token, JSON, erros e desvio para os mocks
│   │   ├── useConsulta.ts        ler dados com os estados carregando, erro e pronto
│   │   ├── useAcao.ts            enviar dados (criar, mudar status) com enviando e erro
│   │   └── sessao.ts             token do lojista
│   ├── comum/                    peças do painel que toda tela usa
│   │   ├── CabecalhoTela.tsx     título, descrição e o <title> da aba
│   │   ├── Estados.tsx           Carregando, Esqueleto, Vazio e Erro
│   │   ├── Campo.tsx, Opcao.tsx  campo de texto, caixa de marcar e rádio
│   │   ├── formatos.ts           paraNivel, lerValorEmCentavos, valorParaCampo
│   │   └── reserva.ts            transições e rótulos do status da reserva
│   ├── layout/                   barra lateral e guarda de login
│   └── telas/
│       ├── atendimento/          o molde: leia estes arquivos primeiro
│       ├── reservas/  produtos/  cupons/  desempenho/
└── mocks/loja/                   3. respostas de mentira, no formato da API
```

Os componentes do design system (`Button`, `StatTile`, `ReservaStatus`...) vêm de `src/componentes` e o movimento vem de `src/movimento`. Não crie componente novo se um destes resolve.

## O Atendimento em uma olhada

```text
TelaAtendimento      cabeçalho com o resumo das reservas e, embaixo, uma das duas fases
├─ LeitorQR          1. esperando o QR (câmera ou "Simular leitura")
└─ ClienteLido       2. QR lido: GET /api/loja/atendimento/{qr} e os quatro estados
   ├─ FichaCliente, ReservaStatus
   └─ RegistrarCompra → POST /api/loja/compras → Recibo (pontos somando)
```

Cada arquivo faz uma coisa. A tela (`TelaAtendimento.tsx`) só organiza; quem busca dados é o bloco que precisa deles (`ClienteLido`, `ResumoReservas`).

## Passo a passo

O exemplo abaixo monta a tela de **Reservas**. As rotas dela já estão prontas no cliente e no mock, então você começa direto no passo 4. Para Produtos, Cupons e Desempenho, comece no passo 1.

### 1. Tipos

Em `src/tipos/loja.ts`, escreva o corpo do pedido e da resposta de cada rota, copiando os nomes de `docs/api.md`: valores em centavos (`precoCentavos`), datas em ISO 8601, nível em maiúsculas (`'CAPIM'`). Quando o contrato não detalha um campo, escreva a sua proposta e deixe um comentário, como em `ReservaDaLoja`.

```ts
export interface CupomDaLoja {
  id: string
  titulo: string
  tipo: 'PERCENTUAL' | 'VALOR' | 'BRINDE'
  /** PERCENTUAL: 1 a 100. VALOR: centavos. */
  valor: number
  validade: string
  usos: number
}
```

### 2. Função da rota

Em `src/loja/api/rotas.ts`, uma função por rota. A tela nunca chama `fetch` direto: `requisitar()` põe o token, manda JSON e transforma qualquer erro em `ErroApi`.

```ts
/** GET /api/loja/cupons: os cupons da loja e o uso de cada um (RF23). */
export function listarCupons(sinal?: AbortSignal) {
  return requisitar<Pagina<CupomDaLoja>>('GET', '/api/loja/cupons', { sinal })
}

/** POST /api/loja/cupons */
export function criarCupom(pedido: PedidoCupom) {
  return requisitar<CupomDaLoja>('POST', '/api/loja/cupons', { corpo: pedido })
}
```

Nunca mande o `lojaId` no corpo nem na URL: a API usa o do token, e um id de outra loja dá 403.

### 3. Mock

Crie `src/mocks/loja/cupons.ts` respondendo exatamente como a API: o mesmo corpo de sucesso e os erros no formato `{ status, erro, mensagem }`. Use os ajudantes de `resposta.ts` e confira o perfil com `exigirLojista`. Os dados ficam em `dados.ts`.

```ts
export function listarCupons(pedido: PedidoMock): RespostaMock {
  const negado = exigirLojista(pedido)
  if (negado) return negado
  const resposta: Pagina<CupomDaLoja> = { itens: banco.cuponsDaLoja, total: banco.cuponsDaLoja.length }
  return ok(resposta)
}
```

E acrescente uma linha em `ROTAS_MOCKADAS`, no `src/mocks/loja/index.ts`:

```ts
'GET /api/loja/cupons': listarCupons,
```

Pronto: `listarCupons()` já responde, com 350 ms de atraso para você ver o estado de carregando. Escreva também um teste em `tests/unidade/loja-mocks.test.ts` conferindo o formato e as regras. É ele que garante que a troca pela API real não vai quebrar a tela.

### 4. A tela

Cada tela é uma pasta em `src/loja/telas/<tela>/`, com o arquivo `Tela<Nome>.tsx` e um arquivo por bloco. A tela de Reservas já está registrada em `src/loja/navegacao.ts`. Para uma tela nova, acrescente uma linha lá, e a rota e o item da barra lateral aparecem sozinhos.

A tela sempre começa assim:

```tsx
export function TelaReservas() {
  const ref = useEntrada<HTMLDivElement>()
  return (
    <div ref={ref} className="flex flex-col gap-6">
      <CabecalhoTela titulo="Reservas" descricao="As reservas da loja por status." />
      <div data-anim>
        <ListaDeReservas />
      </div>
    </div>
  )
}
```

O `CabecalhoTela` já põe o título da aba do navegador e o `data-anim` do cabeçalho. Se a tela tem números ou filtros no topo, passe-os como filhos dele, como o `ResumoReservas` no Atendimento.

### 5. Os quatro estados

Toda tela prevê carregando, vazio, erro e com dados (`docs/telas.md`). Quem busca é o `useConsulta`, que devolve um desses estados de cada vez:

```tsx
// Fora do componente: a função não muda a cada render e a busca acontece uma vez só.
const buscarAtivas = (sinal: AbortSignal) => listarReservas({ status: [...STATUS_ATIVOS] }, sinal)

function ListaDeReservas() {
  const consulta = useConsulta(buscarAtivas)

  if (consulta.estado === 'carregando') {
    return (
      <Carregando rotulo="Carregando as reservas" className="flex flex-col gap-3">
        <Esqueleto className="h-[120px]" />
        <Esqueleto className="h-[120px]" />
      </Carregando>
    )
  }
  if (consulta.estado === 'erro') {
    const { erro, recarregar } = consulta
    return <Erro erro={erro} aoTentarDeNovo={erro.passageiro ? recarregar : undefined} />
  }
  if (consulta.dados.itens.length === 0) {
    return <Vazio>Nenhuma reserva ativa agora.</Vazio>
  }
  return <Reservas reservas={consulta.dados.itens} aoMudar={consulta.recarregar} />
}
```

- **Carregando:** `Esqueleto` no formato do conteúdo, parado. Nada pisca nem pulsa.
- **Vazio:** uma frase curta dizendo o que fazer.
- **Erro:** a `mensagem` da API já vem pronta para o usuário. Só ofereça "Tentar de novo" quando adianta (`erro.passageiro`: sem conexão ou erro do servidor).
- **Se a busca depende de algo** (um id, um filtro), embrulhe em `useCallback`, como o `ClienteLido` faz com o `qr`. Quando o valor muda, a consulta refaz sozinha.

Para **enviar** (criar, editar, mudar status), use o `useAcao`. Ele nunca lança erro: devolve o resultado, ou `null` com o erro guardado em `erro`.

```tsx
const ACAO: Record<StatusPedidoPelaLoja, string> = {
  CONFIRMADA: 'Confirmar', SEPARADA: 'Separar', RETIRADA: 'Entregar', CANCELADA: 'Cancelar',
}

function AcoesDaReserva({ reserva, aoMudar }: { reserva: ReservaDaLoja; aoMudar: () => void }) {
  const mudar = useAcao(mudarStatusReserva)
  return (
    <div className="flex flex-wrap gap-2">
      {TRANSICOES_DA_LOJA[reserva.status].map((status) => (
        <Button
          key={status}
          size="sm"
          variant={status === 'CANCELADA' ? 'danger' : 'secondary'}
          disabled={mudar.enviando}
          onClick={async () => (await mudar.executar(reserva.id, status)) && aoMudar()}
        >
          {ACAO[status]}
        </Button>
      ))}
      {mudar.erro && <Erro erro={mudar.erro} />}
    </div>
  )
}
```

Formulários usam `Campo` (rótulo, 16 px, 44 px de altura, erro ligado ao campo) e `Opcao` (caixa de marcar e rádio). Dinheiro digitado vira centavos com `lerValorEmCentavos`. Veja o `RegistrarCompra.tsx`.

### 6. Animação de entrada

A tela entra em cascata: cada elemento com `data-anim` dentro do `ref` do `useEntrada` sobe 24 px e aparece, 60 ms depois do anterior. Com `prefers-reduced-motion`, vira só um fade. O preset já cuida disso.

- Marque com `data-anim` os blocos de primeiro nível: o cabeçalho (o `CabecalhoTela` já marca) e cada cartão ou seção.
- **Bloco que chega depois** (a lista que aparece quando os dados chegam) tem o próprio `useEntrada`, como o `AtendimentoDoCliente` no `ClienteLido.tsx`. Como ele monta depois da tela, não anima duas vezes.
- **Não ponha `data-anim` num bloco que já existe quando a tela monta e que está dentro de outro bloco com `useEntrada`.** Ele seria animado pelos dois.
- Os outros movimentos da marca estão em `src/movimento`. `somarPontos` é o do recibo; `encherBarra` serve para barras de progresso. Anime só quando algo chega, se soma ou é conquistado.

## Regras do design system

- Cores, fontes, espaços, raios e sombras só dos tokens: `bg-surface-raised`, `text-ink-muted`, `rounded-md`, `p-5`, `shadow-card`. Nenhum hex.
- Texto pelos estilos: `text-title-lg` (título da tela, o `CabecalhoTela` já usa), `text-title-sm` (título de cartão), `text-body`, `text-body-sm`, `text-label`, `text-caption`, `text-price` e `text-metric`.
- `marrom` é ação, `ouro` é marca e conquista, `cerrado` é confirmação, `aviso` é prazo correndo e `perigo` é erro.
- No máximo um `Button variant="primary"` por tela. Confirmar uma venda usa `variant="confirm"`; cancelar, `variant="danger"`.
- Estado sempre com palavra ou ícone, nunca só com cor (`Badge` com texto, `ROTULO_DO_STATUS`).
- Alvo de toque com 44 px (`h-11`, `min-h-11`), foco visível (o anel do `focus-ring` já é global).
- Textos em português, curtos, sem ponto de exclamação e sem "Ops". O erro diz o que aconteceu e o que fazer.
- O vendedor nunca vê a conversa do cliente com a Capi, só a ficha.

## Trocar o mock pela API real

Quando a rota existir em `functions/`:

1. Apague a linha dela em `ROTAS_MOCKADAS` (`src/mocks/loja/index.ts`) e o manipulador, se ninguém mais usa.
2. Rode `npm run dev:api` e, em outro terminal, `npm run dev`, e confira a tela.
3. Se a resposta real vier diferente do tipo, corrija o tipo em `src/tipos/loja.ts`. A tela não muda.

Troque o **login primeiro**. As rotas mockadas aceitam o token real, mas a API real recusa o token do mock.

Para testar tudo contra a API real de uma vez, desligue os mocks:

```bash
VITE_LOJA_MOCKS=0 npm run dev                    # bash
$env:VITE_LOJA_MOCKS='0'; npm run dev            # PowerShell
```

Quando a tabela ficar vazia, apague `src/mocks/loja/` e o bloco `if (MOCKS_LIGADOS)` do `src/loja/api/http.ts`.

## Antes do commit

- [ ] A tela tem os quatro estados: carregando, vazio, erro e com dados.
- [ ] Toda chamada passa por uma função de `src/loja/api/rotas.ts`, com mock enquanto a API não existe.
- [ ] O mock responde no formato de `docs/api.md` e tem teste em `tests/unidade/`.
- [ ] Só componentes de `src/componentes` e classes de token; um único botão primário.
- [ ] Funciona no celular (a barra lateral vira faixa no topo) e no tema escuro.
- [ ] `npm run lint`, `npm test` e `npm run build` passam.
- [ ] Um commit por assunto: `feat(loja): tela de reservas`, `test(loja): mock de cupons`.
