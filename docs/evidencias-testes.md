# Evidências de testes · Missão 2

Este documento reúne a bateria de testes da solução, o resultado do CI, como rodar os testes e os bugs achados no teste como usuário real, cada um com o teste que o cobre e o commit da correção. O plano completo, com o que cada código de teste verifica, está em [testes.md](testes.md).

## Resumo da bateria

| Camada | Onde | O que verifica | Testes |
| --- | --- | --- | ---: |
| Unidade | `tests/unidade` | Regras de negócio (pontos, níveis, cupons, prazos, vagas), formatos, mapa (rotas e entradas), categorias e mocks | 238 |
| API | `tests/api` | Rotas das Functions com JWT de verdade e o banco D1 do Miniflare, recriado a cada teste | 89 |
| Banco | `tests/banco` | Esquema e restrições do D1 (TB01 a TB12 e TB15) | 17 |
| Capi (integração) | `tests/capi` | A Capi com o Claude simulado: ferramentas, limites, prazos, histórico e fotos (TI01 a TI09 e TI12) | 24 |
| E2E | `tests/e2e` | Jornadas completas no Chromium, no celular (390 × 844) e no computador: 9 cenários, 17 execuções e 1 pulada de propósito (TE10 só vale no celular) | 17 |
| Acessibilidade | `tests/a11y` | axe-core, WCAG 2.1 A e AA, sem violação séria ou crítica: 8 telas nos temas claro e escuro | 16 |

São 368 testes no Vitest (unidade, API, banco e Capi) e 33 execuções no navegador (Playwright). Os testes nunca chamam o Claude de verdade: a Capi usa respostas gravadas ou o modo demonstração.

## CI

O [workflow do GitHub Actions](https://github.com/Gustavo16378/tyranitar-capim-dourado/actions/workflows/ci.yml) roda tudo a cada push na `main`: lint, tipos, os 368 testes do Vitest, o build e, num servidor com banco limpo, o E2E e a acessibilidade. O selo do CI fica no topo do README.

Cada correção desta rodada passou no CI no próprio commit:

| Commit | CI |
| --- | --- |
| [`66518ce`](https://github.com/Gustavo16378/tyranitar-capim-dourado/commit/66518ce) foto descrita no histórico, cartões no GET e Nova conversa | [verde](https://github.com/Gustavo16378/tyranitar-capim-dourado/actions/runs/43474383656) |
| [`914a430`](https://github.com/Gustavo16378/tyranitar-capim-dourado/commit/914a430) Capi sem roteiro automático, com conversa salva e tempo limite | [verde](https://github.com/Gustavo16378/tyranitar-capim-dourado/actions/runs/43476055638) |
| [`4b283a2`](https://github.com/Gustavo16378/tyranitar-capim-dourado/commit/4b283a2) mapa pergunta a entrada | [verde](https://github.com/Gustavo16378/tyranitar-capim-dourado/actions/runs/43478146104) |

## Como rodar os testes

Requisito: Node 22.12 ou mais novo. Na primeira vez, `npm install` e `npx playwright install chromium`.

```bash
npm test               # Vitest: unidade, API, banco e Capi (368 testes)
npm run test:unidade   # só os de unidade
npm run test:api       # só API, banco e Capi (runtime do Workers)
npm run test:e2e       # jornadas no navegador, celular e computador
npm run test:a11y      # acessibilidade com axe-core, temas claro e escuro
npm run lint           # ESLint
npm run typecheck      # TypeScript
```

O `test:e2e` e o `test:a11y` sobem sozinhos o site com o modo demonstração e um banco de teste (`tests/e2e/servidor.mjs`). Para reproduzir o CI, rode os dois separados, com `CI=1`: assim cada um começa com o banco limpo.

## Bugs encontrados e corrigidos

Achados no teste do app como usuário real, em 13/11/2026. Cada um tem um teste automatizado que verifica o comportamento corrigido.

| # | Bug | Correção | Teste que cobre | Commit |
| --- | --- | --- | --- | --- |
| 1 | A Capi mandava sozinha a pergunta do roteiro da demonstração ao abrir | Sem roteiro automático. A tela vazia mostra sugestões que só preenchem o campo: a do print do tênis anexa a foto e põe "Tem esse tênis aí no shopping? Uso 42."; as outras são "Quero um presente para minha mãe até R$ 150", "Onde fica a Renner?" e "Tem perfume amadeirado?". Somem depois da primeira mensagem e voltam com "Nova conversa" | TE17 ([`tests/e2e/capi.spec.ts`](../tests/e2e/capi.spec.ts)) e TX02 (acessibilidade da tela vazia) | [`914a430`](https://github.com/Gustavo16378/tyranitar-capim-dourado/commit/914a430), [`08cdfa9`](https://github.com/Gustavo16378/tyranitar-capim-dourado/commit/08cdfa9) |
| 2 | Ao sair da Capi e voltar, a conversa recomeçava do zero | A tela carrega a conversa salva (`GET /api/chat`, com o selo da foto e os cartões de produto); só "Nova conversa" apaga, também no servidor (`DELETE /api/chat`) | TE18 e "GET /api/chat devolve os cartões… DELETE apaga a conversa" ([`tests/capi/conversa.test.ts`](../tests/capi/conversa.test.ts)) | [`66518ce`](https://github.com/Gustavo16378/tyranitar-capim-dourado/commit/66518ce) (API), [`914a430`](https://github.com/Gustavo16378/tyranitar-capim-dourado/commit/914a430) (tela) |
| 3 | Depois de uma foto, a Capi não sabia mais o que tinha visto e podia dizer que não viu foto nenhuma | O histórico guarda a descrição que a Capi fez da foto (`[foto: descrição]`, a partir do que ela mandou procurar em `buscar_similares`); nas mensagens seguintes a foto volta para o Claude como uma foto que ele viu, e o prompt proíbe dizer que não viu | TI12 ([`tests/capi/conversa.test.ts`](../tests/capi/conversa.test.ts)) e a verificação com o Claude real abaixo | [`66518ce`](https://github.com/Gustavo16378/tyranitar-capim-dourado/commit/66518ce), [`23776a8`](https://github.com/Gustavo16378/tyranitar-capim-dourado/commit/23776a8) |
| 4 | Esperando a resposta, o app não dizia nada e não tinha tempo limite | Depois de 2 s, "A Capi está procurando nas lojas…"; em 25 s a chamada é cancelada, com uma mensagem amigável e "Tentar de novo", que manda a mesma mensagem | TE19 (relógio simulado do Playwright: a resposta nunca chega) | [`914a430`](https://github.com/Gustavo16378/tyranitar-capim-dourado/commit/914a430) |
| 5 | O mapa marcava sozinho a entrada mais próxima como "Você está aqui", e o nome da loja de destino aparecia duas vezes | Na primeira rota, o mapa pergunta "Por qual entrada você chegou?" (as entradas do piso, nomeadas no mapa), lembra a resposta por 6 h e aceita `?origem=<entrada>` no link, para o QR de cada entrada abrir o mapa já no lugar certo. Sem resposta, "Saindo da entrada mais próxima", sem "Você está aqui". O nome da loja de destino aparece uma vez | TE20 ([`tests/e2e/mapa.spec.ts`](../tests/e2e/mapa.spec.ts)) e [`tests/unidade/mapa-entradas.test.ts`](../tests/unidade/mapa-entradas.test.ts) (5 testes) | [`4b283a2`](https://github.com/Gustavo16378/tyranitar-capim-dourado/commit/4b283a2) |

### Verificação com o Claude real (bug 3)

Os testes automáticos usam o Claude simulado e conferem o que vai para o modelo. Para ver o comportamento do modelo de verdade, a mesma conversa foi feita em produção, em 13/11/2026, com a conta de demonstração:

1. A cliente manda o print do tênis da demonstração com "Tem esse tênis aí no shopping? Uso 42."
   > Não achei esse modelo exato, mas tenho dois tênis pretos parecidos, ambos com o número 42 e esportivos. O primeiro é de malha, como o da foto, na Authentic Feet, no Térreo. O segundo é mais simples e mais barato, na Centauro, no Térreo. Quer que eu separe algum deles para você?
2. A cliente responde "não gostei".
   > Sem problema. O que você quer mudar: a cor, o modelo ou o preço? Se o que importa é o solado branco grosso e o detalhe verde limão, posso procurar com mais foco nisso. Também posso buscar outras marcas, no número 42.

No banco, a primeira mensagem ficou como `[foto: tênis esportivo preto com solado branco grosso e detalhe verde limão no calcanhar, cor preto, estilo esportivo, categoria calcados] Tem esse tênis aí no shopping? Uso 42.` A imagem não é guardada.

## Correções anteriores, também cobertas por teste

| Bug | Teste | Commit |
| --- | --- | --- |
| A Capi perdia o contexto entre mensagens ("quero um tênis de corrida" → "tem no 42?" → "e em preto?") | TI09, escrito antes da correção e falhando ([`ab1beac`](https://github.com/Gustavo16378/tyranitar-capim-dourado/commit/ab1beac)) | [`0b5d776`](https://github.com/Gustavo16378/tyranitar-capim-dourado/commit/0b5d776) |
| A Carteira sem reservas não dava para rolar pelo teclado | TX05 | [`7094883`](https://github.com/Gustavo16378/tyranitar-capim-dourado/commit/7094883) |
| O teste dos relatórios da loja dependia do movimento deixado por outros testes | TX07 | [`1fef55c`](https://github.com/Gustavo16378/tyranitar-capim-dourado/commit/1fef55c) |
| O contraste do cupom do Início era medido com o cupom cortado na borda da tela, e o resultado dependia da data | TX03 | [`8c9679a`](https://github.com/Gustavo16378/tyranitar-capim-dourado/commit/8c9679a) |
