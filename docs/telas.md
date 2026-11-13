# Telas

Esta é a proposta e a estrutura inicial das telas. Elas já usam o design system e estão num protótipo navegável e animado em [Telas da Capi](https://claude.ai/artifact/YAXFDzbKidjQGk8pBoG3oy), onde dá para percorrer a jornada inteira, do chat à compra no balcão.

## Mapa de navegação do app do cliente

```mermaid
flowchart TB
  abertura["Abertura"] --> inicio["Início"]
  inicio --> capi["Capi (chat)"]
  inicio --> produto["Produto"]
  inicio --> carteira["Carteira"]
  capi --> produto
  capi --> mapa["Mapa e rota"]
  produto --> reservar["Escolher como reservar"]
  produto --> mapa
  reservar --> pix["Pix simulado"]
  reservar --> reserva["Reserva confirmada"]
  pix --> reserva
  reserva --> mapa
  reserva --> carteira
  carteira --> reserva
  carteira --> mapa
  carteira --> balcao(["Vendedor lê o QR no balcão"])
```

A barra de navegação fixa no rodapé leva a Início, Capi, Mapa e Carteira de qualquer tela.

## App do cliente

| Tela | Para que serve | Componentes | Requisitos |
| --- | --- | --- | --- |
| Abertura | Apresentar a Capi; a trança se desenha | CapiMark, Button | RF01 |
| Início | Ofertas para o cliente, produtos salvos e atalho para a Capi | NivelBadge, CupomTicket, ProdutoCard, BottomNav | RF06, RF16 |
| Capi | Conversa com texto, foto ou link; respostas com produtos das lojas | ChatBubble, ChatComposer, ProdutoCard | RF02, RF03, RF04 |
| Produto | Loja, piso, preço, estoque, outras lojas com o item e o botão de reservar | Badge, ProdutoCard, Button | RF05, RF07 |
| Escolher como reservar | Folha que sobe do rodapé: pagar agora com Pix ou pagar na loja | Button, Badge | RF08, RF09, RF13 |
| Pix simulado | QR do Pix e confirmação do pagamento | Button | RF09 |
| Reserva confirmada | Status da reserva e próximos passos | ReservaStatus, Button | RF08, RF09 |
| Mapa | Mapa 3D, um piso por vez (térreo e praça de alimentação), com a loja destacada e a rota da entrada mais próxima | Badge | RF10 |
| Carteira | QR do cliente, pontos, progresso de nível, Minhas reservas (status, prazo e "Como chegar") e cupons | CarteiraQR, ProgressoNivel, Badge, Button, CupomTicket | RF08, RF10, RF11, RF12 |

## Painel da loja

| Tela | Para que serve | Componentes | Requisitos |
| --- | --- | --- | --- |
| Atendimento | Ler o QR do cliente, ver a ficha e as reservas, registrar a compra com os cupons | FichaCliente, ReservaStatus, StatTile, Button | RF18, RF19 |
| Reservas | Lista das reservas do dia por status, com confirmar, separar e retirar | ReservaStatus, Badge | RF20 |
| Produtos | Catálogo da loja, cadastro com atributos por categoria e importação de planilha | ProdutoCard, Button | RF21, RF22 |
| Cupons | Criar cupons da loja e acompanhar o uso | CupomTicket, Button | RF23 |
| Desempenho | Mais vendidos, mais buscados, buscados e não encontrados, picos | StatTile | RF24, RF25 |

## Painel do shopping

| Tela | Para que serve | Componentes | Requisitos |
| --- | --- | --- | --- |
| Lojas | Cadastro de lojas e lojistas | Button, Badge | RF27 |
| Fidelidade e campanhas | Níveis, vouchers e campanhas da vitrine | NivelBadge, CupomTicket | RF28 |
| Demanda | O que os clientes procuram e não acham em nenhuma loja | StatTile | RF29 |
| Jornada e reembolsos | Conversão das reservas e reembolsos devidos às lojas | StatTile | RF30, RF31 |

## Estados de cada tela

Toda tela prevê quatro estados, todos com os componentes do design system:

- **Carregando:** esqueleto no formato do conteúdo, sem tela branca.
- **Vazio:** frase curta dizendo o que fazer ("Você ainda não salvou nenhum produto. Pergunte à Capi.").
- **Erro:** o que aconteceu e como resolver, com botão de tentar de novo. Se a Capi cair, a busca comum continua (RNF10).
- **Com dados:** o estado mostrado no protótipo.

## Prévia

Telas do app do cliente no protótipo:

![Abertura](img/tela-abertura.png)
![Início](img/tela-inicio.png)
![Capi](img/tela-capi.png)
![Produto](img/tela-produto.png)
![Escolher como reservar](img/tela-reservar.png)
![Reserva confirmada](img/tela-reserva.png)
![Mapa](img/tela-mapa.png)
![Carteira](img/tela-carteira.png)

Atendimento no painel da loja:

![Painel da loja, atendimento](img/painel-atendimento.png)

O mapa é 3D (React Three Fiber), um piso por vez, porque o térreo e o 2º piso têm escalas diferentes. As plantas ficam em `src/mapa/piso-1.svg` e `piso-2.svg`, cada loja com o id do seu número (`loja-209`), e a rota sai de `src/mapa/rotas.json` (pontos e caminhos, em metros) pelo menor caminho.
