<p align="center">
  <img src="docs/img/banner.svg" width="100%" alt="Capi · Capim Dourado Shopping. Equipe Tyranitar · HackaRun 2026">
</p>

<p align="center">
  <a href="https://github.com/Gustavo16378/tyranitar-capim-dourado/actions/workflows/ci.yml"><img src="https://github.com/Gustavo16378/tyranitar-capim-dourado/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI"></a>
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.9">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19">
  <a href="https://tyranitar-capim-dourado.pages.dev"><img src="https://img.shields.io/badge/Cloudflare-Pages-F38020?logo=cloudflarepages&logoColor=white" alt="Cloudflare Pages"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/licen%C3%A7a-MIT-blue" alt="Licença MIT"></a>
</p>

Solução da equipe Tyranitar para o tema 04 do HackaRun 2026: a jornada de compra integrada, digital e física, do Capim Dourado Shopping.

## Roteiro para a banca

O app está no ar e não precisa de cadastro: a tela de entrar tem um botão para cada conta de demonstração.

| Link | Botão | O que é |
| --- | --- | --- |
| [tyranitar-capim-dourado.pages.dev](https://tyranitar-capim-dourado.pages.dev) | **Cliente (Ana)** | O app do cliente, feito para o celular (no computador, com a barra lateral) |
| [tyranitar-capim-dourado.pages.dev/loja](https://tyranitar-capim-dourado.pages.dev/loja) | **Lojista** e a loja (a **Centauro** é a primeira) | O painel da loja escolhida |
| [tyranitar-capim-dourado.pages.dev/shopping](https://tyranitar-capim-dourado.pages.dev/shopping) | **Shopping (admin)** | O painel da administração do shopping |

**O fluxo principal em 3 minutos.** Abra o app numa aba (ou no celular) e o painel da loja em outra, com **Lojista** › **Centauro** e a tela Reservas aberta: ela avisa a reserva nova sozinha.

| # | Onde | Faça | O que aparece |
| :---: | --- | --- | --- |
| 1 | App | **Começar** e **Cliente (Ana)** | O Início da Ana, nível Capim, com as ofertas |
| 2 | App › Capi | Toque na sugestão com a foto do tênis e em enviar | A Capi entende a foto e acha o tênis em duas lojas, a Centauro primeiro |
| 3 | App › Capi | **Reservar** no cartão do tênis da Centauro (abre a folha ali mesmo), o tamanho **42**, o cupom **10% em calçados**, **Pagar agora com Pix** e **Já paguei** | O Pix de R$ 359,91 (com o desconto) e a "Reserva enviada", esperando a loja |
| 4 | Painel da loja › Reservas | Espere até 20 s | O selo de reserva nova no menu e um som curto; o cartão com o tamanho, o cupom e "Pago com Pix" |
| 5 | Painel da loja › Reservas | **Confirmar**, a hora em que fica pronta e **Confirmar reserva** | A reserva confirmada, com "Pronta a partir de" e "Retirar até" |
| 6 | App › Início | Toque no sino | O aviso "Centauro confirmou sua reserva", com a hora; na Carteira, "Confirmada · pronta às 15:30" |
| 7 | App › mapa | **Como chegar** e a entrada por onde chegou (ou toque numa entrada no mapa) | A rota 3D da entrada até a loja, com os minutos a pé |
| 8 | Painel da loja › Atendimento | **Simular leitura**, **Retirar** o tênis e, se quiser, um produto da busca no catálogo; **Registrar compra** | O QR da Ana lido (a ficha e a reserva paga) e o recibo com os itens e os pontos |
| 9 | App › Carteira | Abra a carteira | Os pontos somando e a reserva fora de Minhas reservas |

No painel do shopping, veja Demanda (o que os clientes procuram e não acham), Lojas vagas e demanda e QR das entradas. A equipe volta a demonstração ao começo com `npm run demo:reset`, entre um ensaio e outro.

O easter egg tem um [roteiro de 30 segundos](docs/easter-egg.md#roteiro-de-demonstração-em-30-segundos) (com spoiler).

## Missões do HackaRun

| Entrega | Onde está |
| --- | --- |
| Problema e requisitos | [Requisitos](docs/requisitos.md) e o [documento da primeira entrega (PDF)](docs/Capi_Tyranitar_Primeira_Entrega.pdf), com [onde está cada item pedido](docs/primeira-entrega.md) |
| Protótipo funcional | [O app no ar](https://tyranitar-capim-dourado.pages.dev), as [telas](docs/telas.md) e o [design system publicado](https://tyranitar-capim-dourado.pages.dev/design-system) |
| Evidências de testes | [Evidências de testes](docs/evidencias-testes.md): a bateria, o CI e cada bug corrigido com o teste que o cobre; o [plano de testes](docs/testes.md) e o [CI](https://github.com/Gustavo16378/tyranitar-capim-dourado/actions/workflows/ci.yml) |
| Versão final | A branch `main`, publicada em [tyranitar-capim-dourado.pages.dev](https://tyranitar-capim-dourado.pages.dev) |
| Instruções de execução | [Como rodar](#como-rodar), neste README |
| Documentação | A pasta [`docs/`](docs/) (lista em [Documentação](#documentação)) |
| Easter egg | [O tirano da sexta-feira 13](docs/easter-egg.md) (com spoiler) e as dicas recolhidas em [Easter egg](#easter-egg), no fim deste README |

## A solução

O cliente pergunta à **Capi**, a assistente de IA do shopping, por texto, foto ou link. Ela acha o produto nas lojas, o cliente reserva e segue a rota no mapa. No balcão, o vendedor lê o QR da carteira e já sabe o que o cliente procura. A compra vira pontos de fidelidade e dados para lojistas e para o shopping.

Um site só, com três interfaces:

| Rota | Para quem |
| --- | --- |
| `/` | Cliente, no celular (PWA) |
| `/loja` | Lojista |
| `/shopping` | Administração do shopping |
| `/design-system` | Design system: tokens, componentes e movimentos nos temas claro e escuro |

A Capi é a assistente de IA do app; o nome do app será definido junto com o shopping.

### A jornada do cliente

<p align="center">
  <img src="docs/img/jornada.gif" width="300" alt="A jornada no celular: a cliente toca na sugestão com a foto do tênis, a Capi acha o tênis em duas lojas, ela reserva com Pix, diz no mapa por qual entrada chegou, segue a rota até a Centauro e abre a carteira com o QR e os pontos.">
</p>

A cliente toca na sugestão com a foto do tênis (ela só anexa a foto e põe a pergunta no campo) e envia; a Capi acha o tênis em duas lojas, a cliente reserva com Pix, diz no mapa por qual entrada chegou, segue a rota até a loja e abre a carteira. Gravado com o Playwright num celular de 390 px (`node scripts/gravar-jornada.mjs`).

### Telas

| Abertura | Início | Capi | Produto | Como reservar |
| :---: | :---: | :---: | :---: | :---: |
| <img src="docs/img/tela-abertura.png" width="150" alt="Abertura do app com a Capi"> | <img src="docs/img/tela-inicio.png" width="150" alt="Início com ofertas e produtos salvos"> | <img src="docs/img/tela-capi.png" width="150" alt="A Capi vazia, com as sugestões que só preenchem o campo"> | <img src="docs/img/tela-produto.png" width="150" alt="Página do produto"> | <img src="docs/img/tela-reservar.png" width="150" alt="Escolha entre pagar com Pix ou na loja"> |

| Reserva | Mapa | Carteira | Reservas e cupons | Painel da loja |
| :---: | :---: | :---: | :---: | :---: |
| <img src="docs/img/tela-reserva.png" width="150" alt="Reserva separada, com o andamento"> | <img src="docs/img/tela-mapa.png" width="150" alt="Mapa 3D perguntando por qual entrada a cliente chegou, com a rota até a loja"> | <img src="docs/img/tela-carteira.png" width="150" alt="Carteira com o QR e os pontos"> | <img src="docs/img/tela-carteira-reservas.png" width="150" alt="Reservas e cupons na carteira"> | <img src="docs/img/painel-atendimento.png" width="150" alt="Painel da loja atendendo pelo QR"> |

## Funcionalidades

**Cliente** (o app, no celular):

- **Capi:** pergunta por texto, foto (câmera ou galeria) ou link de um produto de outra loja. Ela acha o item nas lojas do shopping e compara os preços; o "Reservar" de cada cartão abre a folha de reserva ali mesmo (a Capi não reserva sozinha, e a mesma reserva em aberto não sai duas vezes). Quando o catálogo não tem o item, indica as lojas da categoria e o caminho até elas, sem inventar produto, preço ou estoque. A conversa fica salva.
- **Produto:** loja, piso, preço, estoque, o mesmo item em outras lojas e reservar com Pix (simulado) ou pagando na loja.
- **Reserva** com o tamanho, a cor e um cupom que vale para o produto (o preço e o Pix já saem com o desconto), paga por Pix (simulado) ou para pagar na loja. A loja confirma dizendo a partir de que horas fica pronta, e o prazo para retirar conta daí: 48 h com o Pix pago, 4 h para pagar na loja. Cancelar, a loja recusar (com o motivo) ou o prazo vencer devolvem o produto à loja, o cupom à carteira e pedem o estorno do Pix.
- **Avisos:** cada mudança da reserva (enviada, confirmada com a hora, separada, recusada, retirada) e os pontos de uma compra aparecem no sino do Início, com o selo também na Carteira.
- **Salvos para provar:** o coração salva o produto (na tela do produto e nos cartões da Capi, do Início e da loja). A aba Salvos junta os salvos por loja, com "Reservar" em cada um e "Como chegar" em cada loja.
- **Página da loja:** tocar no nome de uma loja (no produto, nos cartões, nos salvos e no mapa) abre a loja no app, com a categoria, o piso, os produtos dela e "Como chegar".
- **Mapa 3D** dos dois pisos, com a rota da entrada até a loja. A pessoa diz por onde chegou, toca numa entrada do mapa ou lê o QR da entrada. O mapa abre sem login.
- **Carteira:** o QR para o balcão, os pontos, o nível (Semente, Broto, Capim e Dourado), Minhas reservas (esperando a loja ou "pronta às 15:30", com "Como chegar" e cancelar), Minhas compras (loja, dia, valor pago, cupons usados e pontos ganhos, com "Ver tudo" para a lista inteira) e os cupons, cada um dizendo para que vale ("Calçados na Centauro").
- **Minha conta:** nome e senha, a ficha que a Capi anotou (com o consentimento e um botão para apagar cada interesse), baixar os dados em JSON (LGPD), aparência Automático, Claro ou Escuro, e excluir a conta.
- App instalável (PWA).

**Loja** (`/loja`):

- **Reservas:** a reserva nova chega sozinha (o painel pergunta a cada 20 s), com o selo no menu, um som curto que dá para desligar e o aviso para o leitor de tela. A loja confirma dizendo a partir de que horas fica pronta, separa, ou recusa com o motivo, que o cliente vê.
- **Atendimento:** lê o QR do cliente (câmera ou "Simular leitura"), mostra a ficha filtrada pelas categorias da loja e as reservas dele nesta loja, e registra a compra com itens: a reserva ("Retirar"), produtos da busca no catálogo e "Outros". Os cupons valem item por item ("10% em calçados" só desconta no calçado), com os pontos na hora.
- **Produtos** (cadastro e importação de planilha), **Cupons**, **Desempenho** (mais vendidos, mais buscados, buscados e não encontrados, picos de movimento e as reservas, com as recusadas à parte) e **Extrato** (cada compra com a cliente e os itens, os descontos e os reembolsos a receber).

**Shopping** (`/shopping`):

- **Lojas e lojistas**, **Fidelidade e campanhas** (níveis e vouchers), **Demanda** (o que os clientes buscam e não acham), **Lojas vagas e demanda** (a sugestão de loja para cada unidade vaga), **Reembolsos** dos vouchers e **QR das entradas**, prontos para imprimir.

Nos três: aparência clara ou escura no rodapé da barra lateral (ou na Minha conta), WCAG 2.1 AA (axe em todas as telas principais) e os quatro movimentos da marca, que viram um fade com `prefers-reduced-motion`.

## O que é simulado

| O quê | Na demonstração | Numa versão real |
| --- | --- | --- |
| Pagamento por Pix | O QR e o botão "Já paguei" são simulados, e o estorno do cancelamento também | Um provedor de Pix (PSP) |
| Produtos, preços e estoque | 124 produtos fictícios, nas lojas reais da planta do shopping, com 20 unidades cada | O estoque de cada loja, integrado |
| Buscas da Demanda | 90 dias de buscas inventadas, para os gráficos terem o que mostrar | As buscas de verdade, que o app já grava |
| Clientes e compras | A Ana, com 6 compras e 2.140 pontos; o lojista e o admin do seed | Os cadastros |
| Onde o cliente está | Sem GPS dentro do shopping: a pessoa diz por qual entrada chegou, toca na entrada do mapa ou lê o QR da entrada | Beacons ou QR também nos corredores |
| Leitura do QR no balcão | Funciona com a câmera; "Simular leitura" lê a carteira da Ana sem câmera | A câmera do balcão |
| Capi | O Claude de verdade. Sem internet (ou sem a chave, na máquina), as perguntas do roteiro têm respostas salvas e as outras viram a busca comum do app | O mesmo |

Com o modo demonstração, o app avisa em letra pequena que os produtos, os preços e as buscas são fictícios (veja [Modo demonstração](#modo-demonstração)).

## Arquitetura

```mermaid
flowchart LR
  pessoas(["Cliente, lojista<br/>e shopping"])
  subgraph cf["Cloudflare"]
    front["Front em React (PWA)<br/>no Cloudflare Pages"]
    fn["API em Pages Functions<br/>JWT, perfis e regras"]
    d1[("D1 (SQLite)<br/>lojas, produtos,<br/>reservas, pontos")]
  end
  claude["API do Claude<br/>(Anthropic)"]
  pessoas -->|HTTPS| front
  front -->|"/api"| fn
  fn --> d1
  fn -->|"Capi: texto, foto<br/>e tool use"| claude
```

React 19, Vite, TypeScript e Tailwind no front. Cloudflare Pages Functions e D1 (SQLite) no back, no mesmo deploy. A Capi usa a API do Claude, chamada só pelo servidor: a chave nunca vai para o navegador. Os detalhes, as tecnologias e as pastas estão em [docs/arquitetura.md](docs/arquitetura.md).

## Como rodar

Requisitos: **Node 22** (LTS, 22.12 ou mais novo) e Git. Tudo roda na máquina, sem conta no Cloudflare: o banco D1 local fica na pasta `.wrangler/`. Estes passos foram conferidos num clone limpo do GitHub.

```bash
git clone https://github.com/Gustavo16378/tyranitar-capim-dourado.git
cd tyranitar-capim-dourado
npm install
cp .dev.vars.exemplo .dev.vars        # 1. preencha o .dev.vars (tabela abaixo)
echo VITE_MODO_DEMO=1 > .env.local    # 2. o modo demonstração do front (entra no build)
npm run db:migrar                     # 3. cria as tabelas no D1 local (confirme se o wrangler perguntar)
npm run seed:local                    # 4. lojas, produtos, cupons, usuários e o histórico da Ana
npm run dev:api                       # 5. build e o site com a API em http://localhost:8788
```

Abra [http://localhost:8788](http://localhost:8788), toque em **Começar** e entre com **Cliente (Ana)**. Os painéis ficam em `/loja` e `/shopping`, com os botões **Lojista** e **Shopping (admin)**. Para conferir só a API: `http://localhost:8788/api/saude` responde `{ "ok": true }`.

No Windows, sem o Git Bash, troque o `cp` por `copy .dev.vars.exemplo .dev.vars` e crie o `.env.local` com uma linha só: `VITE_MODO_DEMO=1`.

**O `.dev.vars`** fica fora do Git e guarda os segredos da máquina:

| Variável | Precisa? | O que pôr |
| --- | --- | --- |
| `JWT_SECRET` | Sim | 32 caracteres aleatórios ou mais: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SEED_SENHA_CLIENTE`, `SEED_SENHA_LOJISTA` e `SEED_SENHA_ADMIN` | Sim, para o seed | Senhas de 12 caracteres ou mais para os usuários de teste. O banco guarda só os hashes. Com o modo demonstração, os botões da tela de entrar entram sem senha |
| `ANTHROPIC_API_KEY` | Não | A chave da API do Claude. Sem ela, a Capi responde as perguntas do roteiro com as respostas salvas, e nas outras o app faz a busca comum no catálogo |
| `CAPI_MODELO` | Não | O modelo da Capi; padrão `claude-sonnet-5-5` |

**O `.env.local`** liga os avisos de dados de demonstração no front. O Vite o lê no build, então crie antes do `npm run dev:api` (que faz o build).

**Para desenvolver com recarga**, rode também `npm run dev` (o front em `http://localhost:5173`, que chama a API do `dev:api` pelo proxy de `/api`).

**Testes:** `npm run lint`, `npm run typecheck`, `npm test` (unidade, API, banco e Capi), `npm run test:e2e` e `npm run test:a11y`. Os dois últimos sobem sozinhos o site com o modo demonstração e um banco de teste; na primeira vez, instale o Chromium com `npx playwright install chromium`. O CI roda tudo a cada push. Use o Node 22: no Node 26, o Vitest quebra nos testes de unidade (só funciona com `npx vitest run --project unidade --pool=vmThreads`).

**O seed** não é migration: as migrations só criam o esquema. `npm run seed:local` e `npm run seed:remoto` podem rodar quantas vezes for preciso (atualizam em vez de duplicar), então quando os CSVs mudarem basta rodar de novo. Os dados vêm de `seed/lojas.csv` (as unidades da planta, com número, área e a marca de cada loja) e `seed/produtos.csv` (os produtos de exemplo, com a loja, o preço, o estoque e a foto em `public/produtos/`); para ler de outra pasta, `npm run seed:local -- --csv outra/pasta`. A categoria de cada loja sai do nome da marca (`scripts/categorias-das-marcas.mjs`, ou a coluna `categoria` do `lojas.csv`, se existir) e vem antes das categorias dos produtos dela: é a que dá a capa no painel do shopping. Uma marca nova sem categoria aparece num aviso no fim do seed.

## Modo demonstração

Para o pitch e para a banca testar sem cadastro. **Produtos, preços e buscas fictícios, para demonstração:** as lojas são as do shopping, mas os produtos do `seed/produtos.csv`, os preços e as buscas da Demanda são inventados. Com o modo ligado, o app avisa isso em letra pequena no rodapé da tela de entrar e na tela de produto, e o painel do shopping marca Demanda e Lojas vagas com "Dados de demonstração".

São três chaves, ligadas com `1`; nenhuma é segredo.

| Chave | Quem lê | No hackathon | O que faz |
| --- | --- | --- | --- |
| `VITE_MODO_DEMO` | Front, no build | `1`, no `.env.local` | Os avisos de dados fictícios aparecem (tela de entrar, produto, Demanda e Lojas vagas). Desligada, eles somem. A Capi nunca manda nada sozinha: vazia, ela mostra sugestões que só preenchem o campo, como a do print do tênis do roteiro. |
| `DEMO` | Functions | `1`, no `[vars]` do `wrangler.toml` | Liga `/api/auth/demo` e os botões de conta de demonstração da tela de entrar, sem senha: Cliente (Ana), Lojista (a loja do roteiro) e Shopping (admin). Desligada, a rota responde 404 e os botões somem. |
| `CAPI_MODO_DEMO` | Functions | `0`, no `[vars]` do `wrangler.toml` | Com `0`, a Capi é o Claude de verdade, também no roteiro, e as respostas salvas (`functions/_lib/capi/demonstracao.json`) só entram se ele falhar. Com `1`, o roteiro sai sempre das respostas salvas, sem chamar o Claude (para apresentar sem internet). |

Em produção, `DEMO` e `CAPI_MODO_DEMO` vão no deploy pelo `[vars]` do `wrangler.toml`; o `.dev.vars` muda as duas só na sua máquina. O `VITE_MODO_DEMO` entra no build: o deploy sobe o `dist/` pronto, então o `npm run build` precisa rodar com o `.env.local`. Para desligar depois do hackathon, troque `DEMO` para `"0"` e apague o `.env.local`.

Entre um ensaio e outro, e antes do pitch:

```bash
npm run demo:reset   # no D1 de produção; não precisa de deploy
```

Ele volta a conta da Ana ao seed e não mexe nas contas de outras pessoas:

- apaga as compras de ensaio dela no balcão (as que não são das 6 do seed), com o que cada compra grava junto: os usos de cupom, o reembolso do voucher do shopping, as avaliações e o aviso dos pontos. Os 4 cupons voltam para a carteira e o Extrato e os relatórios da loja ficam sem os ensaios;
- apaga as reservas dela, a conversa com a Capi (para a Capi não lembrar dos ensaios), as buscas que a Capi fez e a ficha;
- roda o seed de novo, que devolve o estoque, a ficha do roteiro (com o consentimento ligado) e os cupons;
- recalcula o saldo pelas 6 compras do seed (2.140 pontos, nível Capim) e mostra o resultado: pontos, nível, cupons na carteira e o Extrato da loja da demonstração.

Os ids das compras e dos cupons do seed ficam em `scripts/lib/ids-do-seed.mjs`, e o SQL do reset em `scripts/lib/demo-reset.mjs`, testado em `tests/api/demo-reset.test.ts`. O reset precisa das senhas `SEED_SENHA_*` no `.dev.vars`, como o `npm run seed:remoto`. Os produtos da demo têm 20 unidades cada no `seed/produtos.csv`, para os ensaios não esgotarem. Para testar na máquina: `node scripts/demo-reset.mjs --local`.

## Documentação

Fica em [`docs/`](docs/):

- [Arquitetura](docs/arquitetura.md)
- [Requisitos](docs/requisitos.md)
- [Telas](docs/telas.md)
- [Design system](docs/design-system.md)
- [Banco de dados](docs/banco.md)
- [API](docs/api.md)
- [UML](docs/uml.md)
- [Plano de testes](docs/testes.md) e [evidências de testes](docs/evidencias-testes.md)
- [Como fazer uma tela de painel](docs/como-fazer-uma-tela.md)
- [Easter egg](docs/easter-egg.md) (com spoiler)
- [Créditos das imagens](docs/creditos.md)
- [Primeira entrega](docs/primeira-entrega.md)

## Próximos passos

O que faríamos numa versão real, com o shopping:

- **Pix de verdade**, por um provedor de pagamento, com o estorno automático do cancelamento.
- **Integração com o estoque das lojas** (o sistema de caixa ou o ERP de cada uma), para o produto e a quantidade virem da loja e a reserva baixar o estoque lá (RF26).
- **Localização dentro do shopping** com beacons ou QR também nos corredores e nas escadas, para a rota sair de onde a pessoa está, e não só da entrada.
- **App nativo** (ou o PWA nas lojas de apps), com notificação push (hoje os avisos aparecem quando o app está aberto), a câmera direto na Capi e a carteira no Wallet do celular.
- **Pontos pela nota fiscal** (RF12): ler o QR da NFC-e de uma compra feita fora do app e consultar a nota na SEFAZ. Hoje os pontos entram pela compra registrada no balcão.
- **Busca por semelhança com vetores** (Cloudflare Vectorize), quando o catálogo das lojas passar de algumas centenas de produtos.
- **O nome do app**, definido junto com o shopping.

## Equipe

| Integrante | Papel |
| --- | --- |
| Gustavo Barbosa Lima | Desenvolvimento back-end, Capi (IA) e integração |
| Gustavo Ferreira | Design, front-end e mapa do shopping |
| Kauã | Documentação e modelo de negócio |
| Diogo | Pitch, roteiro e vídeo |

**Orientadores:** Haroldo Soares e Paulo Rafael.

## Uso de inteligência artificial

Declaração do item 6.3 do edital.

- **Ferramentas:** Claude e Claude Code, da Anthropic.
- **Para quê:** ideação, requisitos, protótipo, programação, testes, documentação e o desenho do mapa das lojas.
- **Revisão:** a equipe revisou e testou tudo o que foi feito com IA.
- **No produto:** a Capi, a assistente do app, usa a API do Claude. A chamada sai só do servidor, que entende a pergunta por texto, foto ou link e busca nos produtos das lojas do shopping.
- **Dados:** os usuários, os produtos, os preços e as buscas do seed são fictícios; as lojas são as do shopping.

## Licença

O código é distribuído sob a [licença MIT](LICENSE), © 2026 Equipe Tyranitar. As fotos dos produtos e das capas são do Unsplash, com a licença própria descrita em [docs/creditos.md](docs/creditos.md).

## Easter egg

<details>
<summary><strong>Não abra numa sexta-feira 13</strong></summary>

<br>

O tirano da sexta-feira 13 deixou rastros no app e no código. Nenhum aparece para quem só usa o app do jeito de sempre: é preciso ir procurar. As dicas dizem onde olhar, não o que tem lá.

- **Na Capi.** Ela atende pelo nome da equipe.
- **No toque.** Treze é o número. Vale tentar no avatar da Capi e no seletor de piso do mapa.
- **No console.** Abra qualquer tela do app com o console do navegador aberto (F12). O tirano deixou o nome dele e diz como acordá-lo. O que ele faz acordado, só vendo.
- **No código-fonte.** Quem lê o código-fonte da página (Ctrl+U) até o fim descobre quem assinou o app.
- **Nos cabeçalhos.** Toda resposta da API traz um recado que não vem no corpo. Olhe a aba Rede do navegador, ou chame a API com `curl -i`.
- **Na API.** O shopping tem uma loja a mais, que só a API atende. O número é o da data; o endereço, do jeito que o mapa escreve as lojas.

Desistiu? A [explicação completa](docs/easter-egg.md) conta tudo.

</details>
