# Easter Egg · O tirano da sexta-feira 13

A missão Easter Egg do HackaRun pede uma surpresa escondida na solução. A nossa parte do nome da equipe: **Tyranitar** é o tirano. A apresentação é no sábado, dia 14, e a sexta-feira 13 foi na véspera. Por isso a história é de ressaca: o tirano acordou de mau humor na sexta-feira 13, e quem chama pelo nome dele vê as luzes do shopping se apagarem.

Nada depende da data. A Capi fala do dia anterior ("Ontem foi sexta-feira 13..."), e o easter egg funciona igual em qualquer dia.

> **Spoiler.** Este documento conta tudo. Para quem quer procurar sozinho, o README tem só as dicas, na seção recolhida "Não abra numa sexta-feira 13".

## Regras

**Originalidade.** Do Pokémon, só o nome da equipe. Nenhuma imagem, silhueta, som, cor característica ou nome de golpe. A Capi Tirana, o gato preto e as rachaduras são desenhos nossos, em SVG, feitos com as cores do design system.

**Acessibilidade.** O easter egg segue as mesmas regras do app (WCAG 2.1 AA):

| Regra | Como é cumprida | Onde é testada |
| --- | --- | --- |
| Nada pisca mais de 3 vezes por segundo (WCAG 2.3.1) | O apagão pisca uma vez a cada meio segundo, duas por segundo. O roteiro das luzes é uma lista de passos (`planoDoApagao.ts`), e uma função conta as piscadas no pior segundo | TU34 |
| Com `prefers-reduced-motion`, nada treme nem pisca: só escurece | O plano reduzido não tem tremor nem rachaduras e tem um passo só, que escurece. O letreiro da Loja 13 só aparece, e o gato preto só aparece e some | TU34, TX11 sem e com movimento reduzido |
| Tudo tem caminho pelo teclado e pelo leitor de tela | "tyranitar" se digita; "Acordar o tirano", "Entrar na Loja 13", "Subir para o nível Tirano" e "Acender as luzes" são botões; o mapa no escuro tem descrição; cada passo do modo tirano é anunciado (`role="status"`) | TE30, TX11 |
| Contraste | No modo tirano o app usa o tema escuro, cujos pares de cor já passam de 4,5:1 (`tests/unidade/contraste-tokens.test.ts`) | TX11, nos temas claro e escuro |
| O modo tem saída | "Acender as luzes" fica numa faixa no topo de toda tela do modo tirano; fechar a aba também acende | TE30, TU33 |

Os 13 toques (no CapiMark e no seletor de piso) são um segredo só do toque e do mouse: o caminho pelo teclado para o tirano é a palavra.

## Os easter eggs

### No app

| Easter egg | Gatilho | O que acontece | Onde está |
| --- | --- | --- | --- |
| Capi Tirana | Mandar só "tyranitar" para a Capi, em qualquer combinação de maiúsculas | A mensagem não vai para a IA nem fica na conversa salva. A Capi vira a Capi Tirana (a espiral com chifres e olhos bravos) e responde: "GRRR... quer dizer, oi! Ontem foi sexta-feira 13 e eu acordei de mau humor. Quer ver o que acontece quando o tirano acorda?", com o botão **Acordar o tirano**. Com o tirano já acordado, ela manda seguir as rachaduras | `src/easter-egg/gatilhos.ts`, `falas.ts`, `src/app/Capi.tsx`, `src/componentes/CapiTirana.tsx` |
| Apagão | **Acordar o tirano**, ou `tyranitar()` no console | A tela treme, rachaduras em SVG se desenham e as luzes piscam até apagar (GSAP, no máximo 3 piscadas por segundo). O app entra no **modo tirano**: tema escuro, a faixa "Modo tirano" com **Acender as luzes** no topo, e o mapa abre sozinho. O modo é um estado global lembrado na sessão (`sessionStorage`): recarregar continua no escuro | `src/easter-egg/Apagao.tsx`, `planoDoApagao.ts`, `Rachaduras.tsx`, `CamadaDoTirano.tsx`, `modoTirano.ts`, `src/tema/aplicarTema.ts` |
| Mapa no escuro | Abrir o mapa no modo tirano | O mapa 3D apaga as luzes. Uma lanterna segue o dedo ou o mouse, e uma trilha de rachaduras em ouro sai da Entrada B pelos corredores até a **Loja 13**, um bloco no átrio do térreo que só existe nesse modo. Os nomes das lojas somem; ficam as entradas e a Loja 13. A equipe aponta o caminho, e **Entrar na Loja 13** leva direto | `src/mapa/Mapa3D.tsx` (Lanterna, TrilhaDeRachaduras), `src/easter-egg/lugarDaLoja13.ts`, `src/app/Mapa.tsx` |
| Loja 13 | Tocar na Loja 13 do mapa no escuro (o bloco ou o nome dele), ou em **Entrar na Loja 13** | A tela da loja secreta: o letreiro **Tyranitar** acende, e a equipe, assustada no escuro, passa a acenar. Os créditos: Gustavo Barbosa Lima, Gustavo Ferreira, Kauã e Diogo como os lojistas do andar secreto, e os orientadores Haroldo Soares e Paulo Rafael. Com as luzes acesas, `/loja-13` volta para o Início | `src/easter-egg/Loja13.tsx`, `equipe.ts`, `Personagem.tsx` |
| Nível Tirano | **Subir para o nível Tirano**, na Loja 13 | Um nível secreto, acima do Dourado, que só o easter egg libera. A carteira mostra a subida de nível (uma vez por sessão), o selo Tirano no cartão do QR e o cupom de demonstração **TYRANITAR13** (13%, "até acender as luzes"). Nada vai para a API: os pontos e os cupons de verdade continuam os mesmos | `src/app/Carteira.tsx`, `src/componentes/nivel.ts`, `NivelBadge.tsx` |
| Acender as luzes | O botão da faixa "Modo tirano" | Tudo volta ao normal: o tema que a pessoa escolheu, o nível e os cupons de verdade, o mapa com as lojas, a Capi de sempre. A Loja 13 deixa de existir | `src/easter-egg/CamadaDoTirano.tsx`, `modoTirano.ts` |
| Gato preto | 13 toques seguidos no avatar da Capi, no topo da tela da Capi | Um gato preto atravessa a tela andando, sem pegar o toque. Funciona com as luzes acesas ou apagadas | `src/easter-egg/GatoPreto.tsx`, `gatilhos.ts` |
| Piso 13 | 13 toques seguidos no seletor de piso do mapa | Aparece a aba **Piso 13**: um andar escuro e parado, sem planta, com o recado do tirano e a equipe assustada. Fica no seletor até sair do mapa | `src/easter-egg/Piso13.tsx`, `src/app/Mapa.tsx` |

Uma pausa de mais de 2 s entre dois toques recomeça a contagem dos 13.

### Para quem olha por dentro

| Easter egg | Onde procurar | O que tem lá | Onde está |
| --- | --- | --- | --- |
| Banner no console | O console do navegador (F12), em qualquer tela | TYRANITAR em letras de ASCII, "o tirano da sexta-feira 13" e a dica "digite tyranitar() para acordar o tirano". `tyranitar()` dispara o evento `tyranitar:acordar` no `window`, que o app escuta e transforma no mesmo apagão do botão da Capi | `src/tirano.ts`, `src/easter-egg/console.ts`, `src/main.tsx` |
| Créditos no código-fonte | Ctrl+U, no fim da página | Um comentário com a equipe, os papéis e os orientadores | `index.html` |
| Cabeçalho da API | A aba Rede, ou `curl -i` | Toda resposta das Functions traz `X-Tyranitar: ontem foi sexta-feira 13`, também nos erros | `functions/api/_middleware.ts` |
| A loja que só a API atende | `GET /api/loja-13` | Os créditos em JSON: a equipe, o tema, cada integrante com o papel, os orientadores e o recado "Aqui não se vende nada: só se agradece." | `functions/api/loja-13.ts` |

## Os personagens da equipe

Cada integrante tem um personagem 2D em três poses, usadas assim:

| Pose | Onde aparece |
| --- | --- |
| `acenando` | Loja 13, depois que o letreiro acende |
| `assustado` | Loja 13 enquanto o letreiro acende, e o Piso 13 |
| `apontando` | A dica "Siga as rachaduras até a Loja 13", no mapa no escuro |

Os arquivos ficam em `public/easter-egg/equipe/<nome>-<pose>.png`, com o nome em minúsculas, sem acento e com hífens:

```text
gustavo-barbosa-lima-acenando.png   gustavo-barbosa-lima-assustado.png   gustavo-barbosa-lima-apontando.png
gustavo-ferreira-acenando.png       gustavo-ferreira-assustado.png       gustavo-ferreira-apontando.png
kaua-acenando.png                   kaua-assustado.png                   kaua-apontando.png
diogo-acenando.png                  diogo-assustado.png                  diogo-apontando.png
```

Fundo transparente e quadrado (o app mostra num círculo, com `object-contain`), em torno de 256 × 256 px. Enquanto um PNG não existe (ou não carrega), o app mostra um avatar com a inicial, em `ouro-ink` sobre `ouro-soft`, e a imagem só entra depois de carregar, sem o ícone de imagem quebrada. Basta pôr os arquivos na pasta: não precisa mudar código.

## Testes

| Teste | O que verifica | Onde |
| --- | --- | --- |
| TU31 | A palavra: vale "tyranitar" sozinha, sem diferenciar maiúsculas e com espaços nas pontas; no meio de uma frase ou com outra grafia, a mensagem vai para a Capi de verdade | `tests/unidade/easter-egg.test.ts` |
| TU32 | Os 13 toques: o 13º abre o segredo e a contagem recomeça; uma pausa de mais de 2 s zera | idem |
| TU33 | O modo tirano: acordar passa pelo apagão (que não é lembrado), o fim liga o modo e a sessão lembra; o nível sobe uma vez; acender volta tudo; sem `sessionStorage`, funciona igual | idem |
| TU34 | O apagão: no máximo 3 piscadas em qualquer segundo; com movimento reduzido, sem tremor, sem rachaduras e só escurecendo; a conta das piscadas pega um roteiro rápido demais | idem |
| TU35 | A Loja 13: dentro do piso, a mais de 5 m de toda loja da planta e com outro id que a LOJA 13 de verdade; a trilha sai da Entrada B, segue o grafo e termina na fachada | idem |
| TU36 | Os personagens: os nomes dos PNGs sem acento e a inicial do avatar | idem |
| TU37 | `tyranitar()` no console começa o apagão, como o botão da Capi | idem |
| — | O banner, a dica e o evento de `tyranitar()`; os créditos no comentário do `index.html` | `tests/unidade/tirano.test.ts`, `tests/unidade/creditos-escondidos.test.ts` |
| — | `X-Tyranitar` em toda resposta (também 401, 403, 404, 500 e 204) e `GET /api/loja-13` pública | `tests/api/tirano.test.ts` |
| TE30 | No celular, de "tyranitar" na Capi (sem nenhum `POST /api/chat`) ao apagão, ao mapa no escuro, à Loja 13 e ao nível Tirano com o TYRANITAR13; recarregar continua no escuro sem repetir a subida; **Acender as luzes** volta o tema, o nível, os cupons, o mapa e a Capi | `tests/e2e/easter-egg.spec.ts` |
| TE31 | No computador, `tyranitar()` no console leva ao mapa no escuro | idem |
| — | O banner no console do site de verdade, os créditos no HTML servido e a API com o cabeçalho | `tests/e2e/tirano.spec.ts` |
| TX11 | Capi Tirana, mapa no escuro, Loja 13, nível Tirano e Piso 13 sem violação grave no axe, nos temas claro e escuro, com e sem movimento reduzido | `tests/a11y/telas.spec.ts` |

## Roteiro de demonstração em 30 segundos

Num celular, com a conta de demonstração da Ana já na Capi. Antes, `npm run demo:reset` e a tela da Capi aberta numa conversa nova.

| Tempo | Faça | O que a banca vê | Diga |
| --- | --- | --- | --- |
| 0 s | Escreva **tyranitar** e envie | A Capi vira a Capi Tirana e responde "GRRR... quer dizer, oi! Ontem foi sexta-feira 13..." | "O nome da equipe acorda o tirano." |
| 5 s | Toque em **Acordar o tirano** | A tela treme, racha e as luzes apagam; o mapa abre no escuro | "Ontem foi sexta-feira 13: as luzes do shopping apagaram." |
| 10 s | Passe o dedo pelo mapa e toque no nome **Loja 13**, no fim da trilha dourada (ou em **Entrar na Loja 13**, embaixo do mapa) | A lanterna ilumina as lojas; a trilha leva à Loja 13 | "Uma loja que só existe no escuro." |
| 15 s | Na Loja 13, deixe o letreiro acender | **Tyranitar** acende e a equipe aparece como os lojistas do andar secreto, com os orientadores | "Os créditos da equipe." |
| 20 s | Toque em **Subir para o nível Tirano** | A carteira sobe para o nível secreto, acima do Dourado, com o cupom TYRANITAR13 | "Um nível que nenhuma compra libera." |
| 25 s | Toque em **Acender as luzes** | Tudo volta ao normal: tema, nível, cupons | "E tudo volta ao normal." |

Se sobrar tempo: 13 toques no seletor de piso abrem o **Piso 13**, e 13 toques no avatar da Capi soltam o **gato preto**. No computador, o console (F12) mostra o banner, e `tyranitar()` faz o mesmo apagão.

Para ensaiar de novo, **Acender as luzes** basta: o modo tirano não muda nada no banco. Se quiser começar do zero, feche a aba (o modo fica na sessão).
