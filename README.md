# Jornada de compra integrada · Capim Dourado Shopping

Solução da equipe Tyranitar para o tema 04 do hackathon: integração da jornada de compra digital e física.

O cliente pergunta à **Capi**, a assistente de IA do shopping, por texto, foto ou link. Ela acha o produto nas lojas, o cliente reserva e segue a rota no mapa. No balcão, o vendedor lê o QR da carteira e já sabe o que o cliente procura. A compra vira pontos de fidelidade e dados para lojistas e para o shopping.

Um site só, com três interfaces:

| Rota | Para quem |
| --- | --- |
| `/` | Cliente, no celular (PWA) |
| `/loja` | Lojista |
| `/shopping` | Administração do shopping |
| `/design-system` | Design system: tokens, componentes e movimentos nos temas claro e escuro |

O app ainda não tem nome definitivo: o nome vem da constante `APP_NOME`, em `src/config.ts`.

## Stack

React 18, Vite, TypeScript e Tailwind no front. Cloudflare Pages Functions e D1 (SQLite) no back, no mesmo deploy. A Capi usa a API do Claude, chamada só pelo servidor.

## Como rodar

Requisito: Node 22.12 ou mais novo.

```bash
npm install
cp .dev.vars.exemplo .dev.vars   # preencha as chaves e as senhas; o .dev.vars fica fora do Git
npm run db:migrar                # cria as tabelas no banco D1 local
npm run seed:local               # lojas da planta, produtos, cupons e usuários de teste
npm run dev                      # front em http://localhost:5173
npm run dev:api                  # build + Functions e D1 local em http://localhost:8788
```

Com os dois rodando, o front do `npm run dev` chama a API pelo proxy de `/api`. Para conferir as Functions: `http://localhost:8788/api/saude` responde `{ "ok": true }`. Os usuários de teste (cliente, lojista e administração) estão descritos no `.dev.vars.exemplo`; as senhas ficam só no `.dev.vars` de cada um.

O seed não é migration: as migrations só criam o esquema. `npm run seed:local` e `npm run seed:remoto` podem rodar quantas vezes for preciso (atualizam em vez de duplicar), então quando os CSVs das lojas e dos produtos mudarem basta rodar de novo.

Outros comandos: `npm run build`, `npm run lint` e `npm test`.

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
- [Primeira entrega](docs/primeira-entrega.md)
