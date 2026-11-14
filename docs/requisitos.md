# Requisitos

Este documento define o que o sistema faz (requisitos funcionais), como ele precisa se comportar (requisitos não funcionais) e as regras de negócio que valem em todo o sistema. Cada requisito tem um código usado na UML, na API e no plano de testes.

## Contexto

**Desafio:** tema 04, integração da jornada de compra digital e física.

**Cliente:** Capim Dourado Shopping, em Palmas (TO). O térreo concentra as lojas e o segundo piso é a praça de alimentação.

**Problema:** o consumidor pesquisa produtos, compara preços e lê avaliações na internet, e depois vai comprar presencialmente. A experiência fica fragmentada entre o digital e o físico, e o shopping e os lojistas perdem a continuidade da jornada e o relacionamento com o cliente.

**Solução:** um app web (PWA) com a Capi, assistente de IA do shopping. O cliente conversa com ela de qualquer lugar (texto, foto ou link), encontra o produto nas lojas, reserva, usa cupons e chega à loja com o vendedor já sabendo o que ele procura. Cada compra volta para o app como pontos de fidelidade e como dados para lojistas e shopping.

## Perfis de usuário

| Perfil | Quem é | Onde usa |
| --- | --- | --- |
| Cliente | Consumidor do shopping | App web (PWA), no celular |
| Lojista | Gerente ou vendedor de uma loja | Painel da loja (`/loja`), no computador, celular ou tablet do balcão |
| Administração do shopping | Equipe de marketing e operação do shopping | Painel do shopping (`/shopping`) |

## Requisitos funcionais

Prioridade **MVP** entra na demo do hackathon. **Desejável** entra se houver tempo. **Futuro** fica como evolução no pitch.

### Cliente

| Código | Requisito | Prioridade |
| --- | --- | --- |
| RF01 | Cadastrar-se e entrar com e-mail e senha | MVP |
| RF02 | Conversar com a Capi por texto e receber produtos do catálogo como resposta | MVP |
| RF03 | Enviar foto ou print à Capi e receber produtos iguais ou parecidos das lojas do shopping | MVP |
| RF04 | Enviar o link de um produto à Capi e receber produtos iguais ou parecidos | Desejável |
| RF05 | Buscar produtos em todas as lojas, com filtro por categoria, loja e faixa de preço | MVP |
| RF06 | Ver a vitrine de ofertas, com cupons das lojas e campanhas do shopping | MVP |
| RF07 | Ver a página do produto, com as lojas que o têm, preço, estoque e avaliações | MVP |
| RF08 | Reservar um produto para pagar e retirar na loja, escolhendo o tamanho, a cor e um cupom que vale para ele | MVP |
| RF09 | Reservar um produto pagando antes por Pix (simulado) e retirar no balcão | MVP |
| RF10 | Ver o mapa 3D do shopping com a loja destacada e a rota até ela | MVP |
| RF11 | Ver a carteira: QR do cliente, cupons disponíveis, pontos e nível de fidelidade | MVP |
| RF12 | Registrar uma compra lendo o QR da nota fiscal (NFC-e) | Desejável |
| RF13 | Autorizar ou revogar o compartilhamento da ficha de preferências com as lojas | MVP |
| RF14 | Receber notificações no app a cada mudança da reserva (enviada, confirmada com a hora, separada, recusada, expirada, retirada) e dos pontos, com o selo no Início e na Carteira | MVP |
| RF15 | Avaliar um produto depois de uma compra registrada | Desejável |
| RF16 | Salvar produtos como favoritos e ver o histórico de reservas e compras | Desejável |

### Lojista

| Código | Requisito | Prioridade |
| --- | --- | --- |
| RF17 | Entrar no painel da loja com e-mail e senha | MVP |
| RF18 | No Atendimento, ler o QR do cliente e ver a ficha, as reservas e os cupons válidos dele | MVP |
| RF19 | Registrar uma compra no caixa com itens (as reservas da cliente nesta loja, produtos do catálogo e valor avulso) e os cupons, com o desconto item por item | MVP |
| RF20 | Gerir as reservas da loja: confirmar com a hora em que fica pronta, separar e recusar com motivo, com o aviso de reserva nova | MVP |
| RF21 | Cadastrar e editar produtos, com atributos que mudam conforme a categoria | MVP |
| RF22 | Importar produtos por planilha CSV | Desejável |
| RF23 | Criar cupons da loja e acompanhar o uso | MVP |
| RF24 | Ver os relatórios de desempenho (mais vendidos, mais buscados, buscados e não encontrados, produtos parados, picos, cupons, ticket médio) | MVP |
| RF25 | Ver o extrato: vendas pela plataforma, desconto concedido em cupons e reembolsos a receber do shopping | Desejável |
| RF26 | Sincronizar o catálogo pela API da loja (VTEX, Shopify, ERP) | Futuro |

### Administração do shopping

| Código | Requisito | Prioridade |
| --- | --- | --- |
| RF27 | Cadastrar lojas e lojistas | MVP |
| RF28 | Configurar a fidelidade (níveis e vouchers) e criar campanhas e cupons do shopping | MVP |
| RF29 | Ver a demanda: mais buscados e buscados e não encontrados em nenhuma loja | MVP |
| RF30 | Ver a jornada (reservas que viraram retirada, atendimentos com ficha que viraram venda) e o gasto por cliente | Desejável |
| RF31 | Ver os reembolsos devidos a cada loja e marcá-los como pagos | Desejável |

## Requisitos não funcionais

| Código | Requisito | Como verificar |
| --- | --- | --- |
| RNF01 | O app do cliente é um PWA responsivo, pensado primeiro para celular, e pode ser instalado na tela inicial | Teste manual em Android e iPhone; Lighthouse |
| RNF02 | As rotas da API sem IA respondem em menos de 500 ms; a Capi responde em até 8 s | Medição nos testes de API e na demo |
| RNF03 | Custo zero de operação na escala da demo (planos gratuitos do Cloudflare) | Painel do Cloudflare |
| RNF04 | Senhas guardadas só como hash (PBKDF2 com sal); sessão por JWT com expiração de 12 horas | Testes de unidade e de API |
| RNF05 | Cada rota confere o perfil do usuário; o lojista só acessa dados da própria loja | Testes de API de autorização |
| RNF06 | LGPD: a ficha só é gerada e mostrada com consentimento, pode ser revogada a qualquer momento e nunca expõe a conversa | Testes de API e de unidade |
| RNF07 | A chave da API do Claude fica só no servidor, como secret, e nunca é enviada ao navegador | Revisão de código e teste de build |
| RNF08 | As telas principais atendem a WCAG 2.1 nível AA, sem violações graves no axe-core | Testes de acessibilidade |
| RNF09 | O mapa 3D roda a pelo menos 30 quadros por segundo num celular intermediário | Teste manual |
| RNF10 | Se a IA falhar, a Capi responde com uma mensagem amigável e a busca comum continua funcionando | Teste de API com falha simulada |
| RNF11 | Interface em português do Brasil, valores em reais e datas no fuso de Palmas (UTC-3) | Revisão e testes E2E |
| RNF12 | Código em TypeScript, com a bateria de testes rodando no CI a cada push | GitHub Actions |

## Regras de negócio

| Código | Regra |
| --- | --- |
| RN01 | A loja confirma a reserva dizendo a partir de que horas ela fica pronta; o prazo para retirar conta dessa hora. Para pagar na loja, são 4 horas. Pendente, a loja tem 4 horas desde a criação para confirmar; depois disso, a reserva expira. |
| RN02 | Uma reserva paga por Pix fica separada por até 48 horas a partir da hora em que fica pronta. |
| RN03 | O estoque é descontado quando a reserva é criada e devolvido quando ela expira, é cancelada pelo cliente ou recusada pela loja. Saindo depois de paga por Pix, o estorno é pedido. |
| RN04 | A ficha do cliente só aparece para a loja se ele deu consentimento, e só com os interesses das categorias que a loja vende. |
| RN05 | Uma compra usa no máximo um cupom da loja e um voucher do shopping (contando os das reservas que saem nela); o voucher desconta sobre o que sobrou depois do cupom da loja. |
| RN06 | Cada cupom tem limite de usos por cliente e data de validade. |
| RN07 | O cliente ganha 1 ponto a cada R$ 1,00 gasto (valor pago, depois dos descontos). |
| RN08 | O nível é calculado pelos pontos dos últimos 12 meses: Semente (0), Broto (500), Capim (2.000) e Dourado (5.000). Os limites iniciais podem ser alterados pelo shopping. |
| RN09 | Uma nota fiscal só pode ser registrada uma vez (chave de acesso única) e só de um CNPJ de loja cadastrada. |
| RN10 | Uma avaliação só pode ser feita depois de uma compra registrada naquela loja, e uma vez por produto. |
| RN11 | Todo voucher do shopping usado numa loja gera um reembolso pendente do shopping para essa loja. |
| RN12 | Toda busca sem resultado é registrada para o relatório de demanda, sem identificar o cliente nos painéis. |
| RN13 | O comparativo com a categoria só é mostrado quando há pelo menos 3 lojas na categoria, para nenhuma loja ver números de outra. |
| RN14 | A Capi só oferece produtos que existem no catálogo e nunca informa preço ou estoque que não veio do banco. |
| RN15 | O cupom da loja com categoria só desconta nos itens dessa categoria e só aparece como opção (na reserva e no caixa) quando há um item dela; sem categoria, vale na compra toda da loja. Valor avulso ("Outros") não tem categoria. O cupom escolhido na reserva já desconta no preço e no Pix e fica preso a ela até a retirada; volta para a carteira se a reserva for cancelada, recusada ou expirar. |

## Fora do escopo do MVP

- Compra online com entrega em casa (a retirada é sempre na loja)
- Pagamento real por Pix ou cartão (na demo, o Pix é simulado)
- Sincronização real com APIs de lojas (RF26)
- Notificação por proximidade ao chegar no shopping (exige app nativo)
