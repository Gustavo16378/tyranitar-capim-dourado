# Jornada de compra integrada · Capim Dourado Shopping

Solução da equipe Tyranitar para o tema 04 do hackathon: integração da jornada de compra digital e física.

O cliente pergunta à **Capi**, a assistente de IA do shopping, por texto, foto ou link. Ela acha o produto nas lojas, o cliente reserva e segue a rota no mapa. No balcão, o vendedor lê o QR da carteira e já sabe o que o cliente procura. A compra vira pontos de fidelidade e dados para lojistas e para o shopping.

Um site só, com três interfaces:

| Rota | Para quem |
| --- | --- |
| `/` | Cliente, no celular (PWA) |
| `/loja` | Lojista |
| `/shopping` | Administração do shopping |

O app ainda não tem nome definitivo: o nome vem da constante `APP_NOME`, em `src/config.ts`.

## Stack

React 18, Vite, TypeScript e Tailwind no front. Cloudflare Pages Functions e D1 (SQLite) no back, no mesmo deploy. A Capi usa a API do Claude, chamada só pelo servidor.

## Como rodar

Requisito: Node 22.12 ou mais novo.

```bash
npm install
cp .dev.vars.exemplo .dev.vars   # preencha as chaves; o .dev.vars fica fora do Git
npm run dev                      # front em http://localhost:5173
npm run dev:api                  # build + Functions e D1 local em http://localhost:8788
```

Com os dois rodando, o front do `npm run dev` chama a API pelo proxy de `/api`. Para conferir as Functions: `http://localhost:8788/api/saude` responde `{ "ok": true }`.

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
