# Primeira entrega

Planejamento técnico inicial da solução da equipe Tyranitar para o tema 04, integração da jornada de compra digital e física, no Capim Dourado Shopping. Esta tabela mostra onde está cada item pedido.

| Item pedido | Resposta | Onde está |
| --- | --- | --- |
| Proposta e estrutura inicial das telas | App do cliente com 9 telas, painel da loja com 5 e painel do shopping com 4, com mapa de navegação, estados e protótipo navegável | Capítulo Telas e o protótipo [Telas da Capi](https://claude.ai/artifact/YAXFDzbKidjQGk8pBoG3oy) |
| Documentação inicial do projeto | Requisitos (31 funcionais, 12 não funcionais, 14 regras de negócio), UML, banco de dados, API, plano de testes e guia da equipe | Capítulos Requisitos, UML, Banco de dados, API, Plano de testes e Como contribuir |
| Linguagem de programação escolhida | **TypeScript** no front e no back, com SQL no banco | Capítulo Arquitetura |
| Arquitetura proposta | Aplicação web em um repositório e um deploy: front em React servido pelo Cloudflare Pages, API em Pages Functions no mesmo domínio, banco D1, e a Capi chamando a API do Claude a partir do servidor | Capítulo Arquitetura |
| Plataforma e tecnologias adotadas | PWA para celular e computador. React, Vite, Tailwind, React Three Fiber, GSAP, Cloudflare Pages, Functions e D1, API do Claude, Vitest, Playwright e axe-core | Capítulos Arquitetura e Design system |
| Como a tecnologia sorteada será incorporada | **Design system** com a paleta do shopping: tokens como fonte única, ligados ao Tailwind, 13 componentes React, padrões de movimento com GSAP, regras de uso e testes | Capítulo Design system e o sistema publicado [Capi · Capim Dourado](https://claude.ai/artifact/MnnouyprwtTRu9F7JV8TmL) |

## A solução em uma frase

A Capi é a assistente de IA do Capim Dourado Shopping: o cliente pergunta por texto, foto ou link, ela acha o produto nas lojas, reserva, mostra a rota e, quando o cliente chega ao balcão, o vendedor já sabe o que ele procura.

## Equipe

| Papel | Responsabilidade |
| --- | --- |
| Desenvolvimento (back e Capi) | API, banco, assistente de IA, deploy e integração |
| Desenvolvimento (design e front) | Telas do app e dos painéis, planta do shopping em SVG |
| Documentação e modelo de negócio | Documentação, dados reais das lojas, modelo de negócio |
| Pitch | Roteiro, gravação e edição do vídeo |
