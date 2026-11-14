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

## Primeira entrega

- [Documento da primeira entrega (PDF)](docs/Capi_Tyranitar_Primeira_Entrega.pdf)
- [Onde está cada item pedido](docs/primeira-entrega.md)
- [Evidências de testes (Missão 2)](docs/evidencias-testes.md): a bateria, o CI e os bugs corrigidos com o teste de cada um
- [Design system publicado](https://tyranitar-capim-dourado.pages.dev/design-system)
- [App no ar](https://tyranitar-capim-dourado.pages.dev)

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
- [Plano de testes](docs/testes.md)
- [Créditos das imagens](docs/creditos.md)
- [Primeira entrega](docs/primeira-entrega.md)

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

<details>
<summary><strong>Não abra numa sexta-feira 13</strong></summary>

<br>

O tirano da sexta-feira 13 deixou quatro rastros no código. Nenhum aparece para quem só usa o app: é preciso ir procurar. As dicas dizem onde olhar, não o que tem lá.

- **No console.** Abra qualquer tela do app com o console do navegador aberto (F12). O tirano deixou o nome dele e diz como acordá-lo. O que ele faz acordado, só vendo.
- **No código-fonte.** Quem lê o código-fonte da página (Ctrl+U) até o fim descobre quem assinou o app.
- **Nos cabeçalhos.** Toda resposta da API traz um recado que não vem no corpo. Olhe a aba Rede do navegador, ou chame a API com `curl -i`.
- **Na API.** O shopping tem uma loja a mais, que só a API atende. O número é o da data; o endereço, do jeito que o mapa escreve as lojas.

</details>
