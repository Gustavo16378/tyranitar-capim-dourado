# API

A API fica no mesmo domínio do site, sob `/api`, e fala JSON. Todas as rotas, menos as públicas, exigem o cabeçalho `Authorization: Bearer <token>`. Valores em dinheiro vão em centavos e datas em ISO 8601 (UTC).

## Convenções

**Autenticação:** o token vem do `POST /api/auth/login` e vale 12 horas. O perfil está dentro dele; cada rota confere se o perfil pode usá-la.

**Erros:** sempre no mesmo formato, com o código HTTP no campo `status`.

```json
{
  "status": 409,
  "erro": "SEM_ESTOQUE",
  "mensagem": "Esse produto acabou de esgotar nesta loja."
}
```

| Código | Quando |
| --- | --- |
| 400 | Corpo inválido ou campo faltando (`DADOS_INVALIDOS`) |
| 401 | Sem token, token inválido ou vencido (`NAO_AUTENTICADO`) |
| 403 | Perfil sem permissão ou recurso de outra loja (`SEM_PERMISSAO`) |
| 404 | Recurso não existe (`NAO_ENCONTRADO`) |
| 409 | Conflito com o estado atual: sem estoque, nota repetida, reserva já retirada, e-mail ou CNPJ já cadastrado (`SEM_ESTOQUE`, `NOTA_REPETIDA`, `TRANSICAO_INVALIDA`, `EMAIL_EM_USO`, `CNPJ_EM_USO`) |
| 422 | Regra de negócio violada: cupom inválido, combinação proibida, loja fora do shopping, lojista numa unidade vaga (`CUPOM_INVALIDO`, `CUPONS_INCOMPATIVEIS`, `LOJA_NAO_CADASTRADA`, `LOJA_VAGA`) |
| 503 | A IA não respondeu (`IA_INDISPONIVEL`); o app mostra a busca comum |

**Paginação:** listas aceitam `?pagina=1&tamanho=20` e respondem `{ "itens": [...], "total": 42 }`.

## Resumo das rotas

| Método e rota | Perfil | Requisito |
| --- | --- | --- |
| `POST /api/auth/cadastro` | Público | RF01 |
| `POST /api/auth/login` | Público | RF01, RF17 |
| `GET /api/auth/demo` | Público (só com `DEMO=1`) | RF01 |
| `POST /api/auth/demo` | Público (só com `DEMO=1`) | RF01 |
| `GET /api/lojas` | Público | RF07, RF10 |
| `GET /api/produtos` | Público | RF05 |
| `GET /api/produtos/{id}` | Público | RF07 |
| `GET /api/ofertas` | Público | RF06 |
| `POST /api/chat` | CLIENTE | RF02, RF03, RF04 |
| `GET /api/chat`, `DELETE` | CLIENTE | RF02 |
| `POST /api/reservas` | CLIENTE | RF08, RF09 |
| `GET /api/reservas/{id}` | CLIENTE | RF08, RF09 |
| `POST /api/reservas/{id}/pagamento` | CLIENTE | RF09 |
| `POST /api/reservas/{id}/cancelar` | CLIENTE | RF08 |
| `GET /api/me`, `DELETE /api/me` | CLIENTE | RF13 |
| `GET /api/me/carteira` | CLIENTE | RF11 |
| `GET /api/me/historico` | CLIENTE | RF16 |
| `POST /api/me/notas` | CLIENTE | RF12 |
| `PUT /api/me/consentimento` | CLIENTE | RF13 |
| `GET /api/me/notificacoes` | CLIENTE | RF14 |
| `POST /api/avaliacoes` | CLIENTE | RF15 |
| `GET /api/me/favoritos`, `PUT /api/me/favoritos/{produtoId}`, `DELETE ...` | CLIENTE | RF16 |
| `GET /api/loja/atendimento/{qr}` | LOJISTA | RF18 |
| `POST /api/loja/compras/previa` | LOJISTA | RF19 |
| `POST /api/loja/compras` | LOJISTA | RF19 |
| `GET /api/loja/reservas` | LOJISTA | RF20 |
| `PATCH /api/loja/reservas/{id}` | LOJISTA | RF20 |
| `GET /api/loja/produtos`, `POST`, `PUT /{id}` | LOJISTA | RF21 |
| `POST /api/loja/produtos/importar` | LOJISTA | RF22 |
| `GET /api/loja/cupons`, `POST` | LOJISTA | RF23 |
| `GET /api/loja/relatorios` | LOJISTA | RF24 |
| `GET /api/loja/extrato` | LOJISTA | RF25 |
| `GET /api/shopping/lojas`, `POST`, `PUT /{id}` | ADMIN_SHOPPING | RF27 |
| `GET /api/shopping/lojas/{id}/lojistas` | ADMIN_SHOPPING | RF27 |
| `POST /api/shopping/lojistas` | ADMIN_SHOPPING | RF27 |
| `GET /api/shopping/configuracao`, `PUT` | ADMIN_SHOPPING | RF28 |
| `GET /api/shopping/cupons`, `POST` | ADMIN_SHOPPING | RF28 |
| `GET /api/shopping/demanda` | ADMIN_SHOPPING | RF29 |
| `GET /api/shopping/vagas` | ADMIN_SHOPPING | RF29 |
| `GET /api/shopping/jornada` | ADMIN_SHOPPING | RF30 |
| `GET /api/shopping/reembolsos`, `PATCH /{id}` | ADMIN_SHOPPING | RF31 |

A rota dentro do shopping é calculada no front: a API devolve o `mapa_id` e o `piso` da loja, e o app desenha o caminho.

## Autenticação

### `POST /api/auth/cadastro`

Cria um cliente. Lojistas e administradores são criados pelo painel do shopping.

```json
{ "nome": "Ana Souza", "email": "ana@email.com", "senha": "minimo8caracteres", "consentimentoFicha": false }
```

`consentimentoFicha` é opcional (`false` se não vier): é a caixa de consentimento da ficha de interesses da tela de cadastro, desmarcada por padrão (RF13, RN04). A conta nova começa com 0 pontos, no nível Semente.

Resposta `201`: o mesmo formato do login, já com a sessão aberta. Erros: `400` (senha com menos de 8 caracteres, e-mail inválido), `409` (`EMAIL_EM_USO`).

### `POST /api/auth/login`

```json
{ "email": "ana@email.com", "senha": "minimo8caracteres" }
```

Resposta `200`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "usuario": { "id": "c1f0...", "nome": "Ana Souza", "perfil": "CLIENTE", "lojaId": null }
}
```

Erro `401` com a mesma mensagem para e-mail inexistente e senha errada, para não revelar quais e-mails existem.

### `GET /api/auth/demo` e `POST /api/auth/demo`

As contas de demonstração, para a banca testar o app e os dois painéis sem cadastro: são os botões da tela de login (`/entrar`). São três usuários do seed, um por perfil, e nenhum outro entra por aqui:

| Perfil | Conta | Abre |
| --- | --- | --- |
| `CLIENTE` | `ana.souza@demo.test` (Ana) | o app |
| `LOJISTA` | o lojista da loja do primeiro produto do `produtos.csv` (hoje `lojista.loja-ancora-05@demo.test`, a Centauro) | o painel da loja |
| `ADMIN_SHOPPING` | `admin@demo.test` | o painel do shopping |

O seed grava o e-mail do lojista em `configuracao` (chave `conta_demo_lojista`), para a conta seguir a loja do roteiro; sem essa linha, vale `lojista.loja-pc01a@demo.test`. As duas rotas só existem com o modo demonstração ligado nas Functions (`DEMO=1`, veja o README); desligado, respondem `404` (`NAO_ENCONTRADO`) e a tela de login não mostra os botões.

O `GET` diz quais contas estão no banco, para a tela mostrar um botão por conta (`loja` só no lojista, e o lojista só aparece se a loja dele estiver ativa):

```json
{
  "contas": [
    { "perfil": "CLIENTE", "nome": "Ana Souza", "loja": null },
    { "perfil": "LOJISTA", "nome": "Equipe da Centauro", "loja": "Centauro" },
    { "perfil": "ADMIN_SHOPPING", "nome": "Administração do shopping", "loja": null }
  ]
}
```

O `POST` entra com a conta do perfil pedido, sem senha:

```json
{ "perfil": "LOJISTA" }
```

Sem corpo, entra como a Ana (`CLIENTE`). Resposta `200`: o mesmo formato do login, com o token do perfil da conta (vale 12 horas como qualquer outro). Erros: `400` (`DADOS_INVALIDOS`, perfil que não é um dos três) e `404` (`DEMO` desligado, ou a conta não está no banco com esse perfil).

**Login único.** O app e os painéis entram pela mesma tela, `/entrar`. Depois do login (com senha ou pelos botões), ela segue pelo perfil do token: `CLIENTE` para o Início (ou a tela que pediu o login), `LOJISTA` para `/loja` e `ADMIN_SHOPPING` para `/shopping`. Cada perfil guarda a sessão dele no navegador, então dá para ter o app numa aba e um painel em outra. `/loja` e `/shopping` sem a sessão do perfil certo mandam para `/entrar` e voltam para a mesma tela depois do login.

## Catálogo

### `GET /api/produtos`

Parâmetros: `q` (texto), `categoria`, `loja`, `precoMin` e `precoMax` (centavos), `pagina`, `tamanho`. Uma busca sem resultado é registrada na tabela `busca` (RN12).

```json
{
  "itens": [
    {
      "id": "p1",
      "nome": "Tênis de corrida Pulse",
      "categoria": "calcados",
      "precoCentavos": 39990,
      "estoque": 3,
      "foto": "https://.../pulse.webp",
      "loja": { "id": "l1", "nome": "Loja de esportes", "piso": 1, "mapaId": "loja-esportes" }
    }
  ],
  "total": 1
}
```

### `GET /api/produtos/{id}`

Produto com `atributos`, `fotos`, média e lista de `avaliacoes`, e `outrasLojas` com o mesmo item ou parecidos.

### `GET /api/ofertas`

Cupons ativos e válidos das lojas e do shopping. Com token de cliente, já vem filtrado pelo nível dele e destaca os cupons das categorias da ficha.

## Capi

### `POST /api/chat`

Envia uma mensagem. `texto` (até 1.000 caracteres) é obrigatório quando não há foto nem link. `imagem` e `link` são opcionais e excludentes.

```json
{
  "texto": "Tem esse tênis aí no shopping?",
  "imagem": { "tipo": "image/jpeg", "base64": "/9j/4AAQSk..." }
}
```

- `imagem`: JPEG, PNG, WebP ou GIF, até 4 MB (o app reduz antes de enviar). `base64` aceita também a data URL do navegador (`data:image/jpeg;base64,...`).
- `link`: endereço http ou https de um produto de outra loja. O servidor abre a página (até 5 s) e lê título, imagem e preço pelo Open Graph ou pelo JSON-LD.

Resposta `200`:

```json
{
  "resposta": "Achei dois parecidos aqui no térreo, na Loja de esportes. Quer que eu separe um para você?",
  "produtos": [
    { "id": "p1", "nome": "Tênis de corrida Pulse", "categoria": "calcados", "precoCentavos": 39990, "estoque": 2, "foto": null,
      "loja": { "id": "l1", "nome": "Loja de esportes", "piso": 1, "mapaId": "loja-esportes" } }
  ],
  "acoes": [ { "tipo": "RESERVAR", "produtoId": "p1" }, { "tipo": "ROTA", "lojaId": "l1", "mapaId": "loja-esportes", "piso": 1 } ]
}
```

- `produtos`: no máximo 3 cartões, no mesmo formato da busca, e só produtos que vieram das ferramentas da Capi (RN14).
- `acoes`: `RESERVAR` (o primeiro cartão com estoque, para o botão de reservar), `ROTA` (quando a Capi mostrou o caminho; o app desenha no mapa) e `RESERVA_CRIADA` (`{ "tipo": "RESERVA_CRIADA", "reserva": { "id", "produtoId", "lojaId", "quantidade", "precoCentavos", "status", "formaPagamento", "pago", "expiraEm" } }`, quando o cliente confirmou na conversa e a Capi reservou; com `PIX`, o app abre o pagamento).

Erros: `400` (`DADOS_INVALIDOS`: mensagem vazia, texto longo, foto acima de 4 MB ou fora dos formatos, foto e link juntos, link que não é http/https) e `503` (`IA_INDISPONIVEL`, quando o Claude falha ou passa de 15 s; o app usa a busca comum). Com `CAPI_MODO_DEMO=1`, ou quando o Claude falha, mensagens do roteiro da demonstração recebem uma resposta salva, com produtos buscados no banco.

### `GET /api/chat`

As últimas 50 mensagens do cliente, para reabrir a conversa (o app carrega ao abrir a Capi), da mais antiga para a mais nova:

```json
{
  "itens": [
    { "id": "m1", "papel": "CLIENTE", "conteudo": "Tem esse tênis aí no shopping? Uso 42.", "foto": true, "criadoEm": "2026-11-13T15:00:00Z" },
    { "id": "m2", "papel": "CAPI", "conteudo": "Achei parecidos aqui no térreo...", "produtos": [ { "id": "p1", "nome": "Tênis de corrida preto", "...": "..." } ], "criadoEm": "2026-11-13T15:00:04Z" }
  ],
  "total": 2
}
```

A foto não é guardada: `foto: true` diz que a mensagem tinha uma. No banco, a mensagem fica como `[foto: descrição] texto`, com a descrição que a Capi fez da foto (o que ela mandou procurar em `buscar_similares`), e é assim que a foto volta para o Claude nas mensagens seguintes. `produtos` são os cartões que a resposta mostrou, dos produtos que ainda estão ativos.

### `DELETE /api/chat`

"Nova conversa": apaga a conversa do cliente com a Capi. Resposta `200`: `{ "apagadas": 4 }`.

## Reservas

### `POST /api/reservas`

```json
{ "produtoId": "p1", "quantidade": 1, "formaPagamento": "PIX" }
```

Resposta `201`:

```json
{
  "id": "r1",
  "status": "PENDENTE",
  "formaPagamento": "PIX",
  "pago": false,
  "precoCentavos": 39990,
  "expiraEm": "2026-11-13T18:00:00Z",
  "pix": { "copiaECola": "00020126...", "simulado": true }
}
```

Erros: `404` (produto não existe ou inativo), `409` (`SEM_ESTOQUE`).

### `GET /api/reservas/{id}`

Uma reserva do cliente logado, com o produto no formato da busca. É o que a tela da reserva lê, então ela abre pelo link (`/reserva/{id}`). O prazo é conferido na leitura: se venceu, a reserva já vem `EXPIRADA` e o estoque volta (RN01 a RN03).

```json
{
  "id": "r1",
  "status": "PENDENTE",
  "formaPagamento": "PIX",
  "pago": false,
  "precoCentavos": 39990,
  "expiraEm": "2026-11-13T18:00:00Z",
  "pix": { "copiaECola": "00020126...", "simulado": true },
  "produto": {
    "id": "p1",
    "nome": "Tênis de corrida Pulse",
    "categoria": "calcados",
    "precoCentavos": 39990,
    "estoque": 2,
    "foto": null,
    "loja": { "id": "l1", "nome": "Loja de esportes", "piso": 1, "mapaId": "loja-esportes" }
  }
}
```

`pix` só vem quando a forma de pagamento é `PIX`. Erro `404` quando a reserva não existe ou é de outro cliente (a mesma resposta nos dois casos, para não revelar reservas dos outros).

### `POST /api/reservas/{id}/pagamento`

Confirma o Pix simulado. A reserva fica `pago: true` e passa a expirar em 48 horas (RN02). O status não muda: ela continua `PENDENTE`, agora paga, porque quem separa o produto é a loja (`PATCH /api/loja/reservas/{id}`). Resposta `200` no formato de `POST /api/reservas`. Erro `409` se já estiver paga, retirada, cancelada ou expirada.

### `POST /api/reservas/{id}/cancelar`

Cancela e devolve o estoque (RN03). Só funciona em reservas `PENDENTE`, `CONFIRMADA` ou `SEPARADA`.

## Área do cliente

### `GET /api/me`

A conta do cliente, para a tela Minha conta.

```json
{
  "id": "c1f0...",
  "nome": "Ana Souza",
  "email": "ana@email.com",
  "nivel": "CAPIM",
  "pontos": 2140,
  "compartilharFicha": true
}
```

Uma conta excluída responde `401`: o token dela não vale mais.

### `DELETE /api/me`

Exclui a conta do cliente (LGPD). Apaga os dados pessoais: nome, e-mail, senha, QR da carteira, ficha, conversa com a Capi, favoritos, notificações e avaliações. As reservas em aberto são canceladas e o estoque volta (RN03). As compras continuam, sem dados pessoais, porque são o registro das lojas (vendas, pontos e reembolsos), e as buscas ficam anônimas (RN12). Depois disso, o e-mail não entra mais e o token antigo responde `401`.

Resposta `204`. Erro `403` para a conta de demonstração enquanto `DEMO=1`, para a banca não derrubar o login de demonstração.

### `GET /api/me/carteira`

```json
{
  "qrToken": "q-7f3a...",
  "pontos": 2140,
  "nivel": "CAPIM",
  "proximoNivel": { "nivel": "DOURADO", "faltam": 2860 },
  "cupons": [
    { "id": "cp1", "titulo": "10% em calçados", "loja": "Loja de esportes", "validade": "2026-12-31", "tipo": "PERCENTUAL", "valor": 10, "nivelMinimo": "SEMENTE" },
    { "id": "cp2", "titulo": "R$ 20 em qualquer loja", "loja": null, "validade": "2026-12-15", "tipo": "VALOR", "valor": 2000, "nivelMinimo": "SEMENTE" }
  ],
  "reservasAtivas": [
    {
      "id": "r1",
      "produto": "Tênis de corrida Pulse",
      "status": "SEPARADA",
      "pago": true,
      "expiraEm": "2026-11-15T18:00:00Z",
      "loja": { "nome": "Loja de esportes", "piso": 1, "mapaId": "loja-esportes" }
    }
  ]
}
```

As reservas em aberto (`PENDENTE`, `CONFIRMADA` ou `SEPARADA`), as que vencem primeiro na frente, trazem a loja para o botão "Como chegar" (`mapaId` abre o mapa nela).

Cada cupom traz `tipo` (`PERCENTUAL`, `VALOR` ou `BRINDE`), `valor` (a porcentagem, ou centavos no `VALOR`) e `nivelMinimo`, para o app montar o canhoto ("10%", "R$ 20") e o selo de nível. `loja` vem `null` no voucher do shopping.

### `GET /api/me/favoritos`

Os produtos que o cliente salvou, do mais recente para o mais antigo, no formato da busca e com paginação. O Início mostra em "Você salvou".

```json
{
  "itens": [
    {
      "id": "p1",
      "nome": "Tênis de corrida Pulse",
      "categoria": "calcados",
      "precoCentavos": 39990,
      "estoque": 2,
      "foto": null,
      "loja": { "id": "l1", "nome": "Loja de esportes", "piso": 1, "mapaId": "loja-esportes" }
    }
  ],
  "total": 1
}
```

### `POST /api/me/notas`

```json
{ "urlQr": "https://www.sefaz.to.gov.br/nfce/qrcode?p=17261112345678000199650010000001231123456789|2|1|1|...", "valorCentavos": 15990 }
```

A API extrai a chave de acesso (44 dígitos) e o CNPJ (dígitos 7 a 20 da chave). Resposta `201` com a compra e os pontos. Erros: `400` (QR sem chave válida), `409` (`NOTA_REPETIDA`), `422` (`LOJA_NAO_CADASTRADA`).

### `PUT /api/me/consentimento`

```json
{ "compartilharFicha": false }
```

Com `false`, a ficha é apagada na hora (RNF06); com `true` de novo, ela recomeça vazia e a Capi preenche nas próximas conversas. Resposta `200`: a conta atualizada, no formato de `GET /api/me`. Erro `400` se `compartilharFicha` não for `true` ou `false`.

## Painel da loja

Todas as rotas usam o `lojaId` do token. Um id de outra loja no corpo ou na rota resulta em `403`.

### `GET /api/loja/atendimento/{qr}`

```json
{
  "cliente": { "nome": "Ana", "nivel": "CAPIM" },
  "ficha": [ "Tênis de corrida, número 42, até R$ 400, prefere preto", "Camisetas dry-fit" ],
  "reservas": [ { "id": "r1", "produto": "Tênis de corrida Pulse", "foto": "/produtos/tenis-pulse.webp", "status": "SEPARADA", "pago": true } ],
  "cupons": [ { "id": "cp1", "titulo": "10% em calçados", "origem": "LOJA" }, { "id": "cp2", "titulo": "R$ 20 do shopping", "origem": "SHOPPING" } ]
}
```

`ficha` vem vazia quando o cliente não deu consentimento, e só traz as categorias que a loja vende (RN04). `foto` é a primeira foto do produto (a miniatura no balcão), ou `null` quando ele não tem. `cupons` traz os da loja primeiro e depois os vouchers do shopping; em cada grupo, os que dão desconto antes dos brindes (o caixa já marca o primeiro de cada grupo).

### `POST /api/loja/compras/previa`

O mesmo corpo de `POST /api/loja/compras`, mas não grava nada: calcula a compra para o caixa mostrar "Cliente paga" enquanto o vendedor marca os cupons, antes de registrar. Aplica as mesmas regras.

Resposta `200`: a compra como ficaria, sem `id`.

```json
{
  "valorBrutoCentavos": 45980,
  "descontos": [ { "cupom": "cp1", "centavos": 4598 }, { "cupom": "cp2", "centavos": 2000 } ],
  "valorPagoCentavos": 39382,
  "pontosGerados": 393,
  "reembolsoGerado": { "cupom": "cp2", "centavos": 2000 }
}
```

Erros: os mesmos de `POST /api/loja/compras`.

### `POST /api/loja/compras`

```json
{ "qrToken": "q-7f3a...", "valorCentavos": 45980, "cupons": ["cp1", "cp2"] }
```

Para registrar a retirada de uma reserva, envie também `reservaId`. Se ela foi paga por Pix, envie `valorCentavos: 0` e nenhum cupom: a compra entra com o valor da reserva, o caixa não cobra de novo e os pontos são somados na retirada.

Resposta `201`:

```json
{
  "id": "co1",
  "valorBrutoCentavos": 45980,
  "descontos": [ { "cupom": "cp1", "centavos": 4598 }, { "cupom": "cp2", "centavos": 2000 } ],
  "valorPagoCentavos": 39382,
  "pontosGerados": 393,
  "reembolsoGerado": { "cupom": "cp2", "centavos": 2000 }
}
```

Erros: `422` (`CUPOM_INVALIDO` por validade, limite ou nível; `CUPONS_INCOMPATIVEIS` para dois cupons da mesma loja), `409` (reserva já retirada).

### `GET /api/loja/reservas`

Parâmetros: `status` (um ou mais, separados por vírgula: `PENDENTE,CONFIRMADA,SEPARADA`; sem ele, todos), `pagina` e `tamanho` (até 100). Vem primeiro a que expira primeiro.

```json
{
  "itens": [
    {
      "id": "r1",
      "produto": "Tênis de corrida Pulse",
      "cliente": "Ana",
      "quantidade": 1,
      "status": "SEPARADA",
      "formaPagamento": "PIX",
      "pago": true,
      "precoCentavos": 39990,
      "expiraEm": "2026-11-14T18:00:00Z",
      "criadoEm": "2026-11-12T18:00:00Z"
    }
  ],
  "total": 7
}
```

`cliente` é só o primeiro nome, como no atendimento. `precoCentavos` é o total da reserva, pelo preço do momento da reserva. Reservas vencidas já vêm `EXPIRADA`, com o estoque devolvido (RN01, RN02, RN03).

### `PATCH /api/loja/reservas/{id}`

```json
{ "status": "SEPARADA" }
```

Segue as transições do diagrama de estados: a loja pede `CONFIRMADA`, `SEPARADA`, `RETIRADA` ou `CANCELADA`; cancelar devolve o estoque e separar avisa o cliente. Uma transição proibida devolve `409` (`TRANSICAO_INVALIDA`); reserva de outra loja, `403`. Resposta `200`: a reserva atualizada, no formato de um item de `GET /api/loja/reservas`. Para somar os pontos do cliente, a retirada vai pelo `POST /api/loja/compras` com `reservaId`.

### `GET /api/loja/produtos`

O catálogo da loja, ativos e inativos (os inativos não aparecem na busca nem para a Capi). Parâmetros: `q` (texto no nome, sem diferenciar acento), `pagina` e `tamanho`. Vêm os ativos primeiro, em ordem alfabética.

```json
{
  "itens": [
    {
      "id": "p1",
      "nome": "Tênis de corrida Pulse",
      "descricao": "Leve e com amortecimento",
      "categoria": "calcados",
      "precoCentavos": 39990,
      "estoque": 2,
      "fotos": [ "https://.../pulse.webp" ],
      "atributos": { "numeracao": [ 38, 39, 40, 41, 42, 43 ], "cor": "preto" },
      "ativo": true
    }
  ],
  "total": 9
}
```

### `POST /api/loja/produtos` e `PUT /api/loja/produtos/{id}`

O corpo é um item de `GET /api/loja/produtos` sem o `id`. `categoria` é uma das categorias do shopping (`calcados`, `roupas`, `acessorios`, `perfumaria`, `eletronicos`, `infantil`, `alimentacao`, `pet`, `casa`, `otica`, `livraria`, `esportes`, `joias`); uma categoria nova no catálogo passa a valer para o filtro da ficha (RN04). `fotos` aceita até 8 endereços, cada um com `https://` ou um caminho do próprio site, como `/produtos/tenis-de-corrida.webp`; a primeira é a capa. Os atributos mudam por categoria: `numeracao` (lista de números) e `cor` em calçados, `tamanhos` (lista) e `cor` em roupas, `cor` e `material` em acessórios, `ml` (número) e `familia` em perfumaria.

Resposta: `201` (criar) ou `200` (editar) com o produto. Erros: `400` (`DADOS_INVALIDOS`: nome de 2 a 120 caracteres, preço maior que zero, estoque inteiro de zero ou mais, categoria conhecida, foto com endereço aceito), `404` (produto de outra loja ou inexistente).

### `POST /api/loja/produtos/importar`

Recebe um CSV (`text/csv`) com as colunas `nome,descricao,categoria,preco,estoque,fotos,atributos`. O preço vai em reais com vírgula ou ponto; `fotos` separadas por `|` (ou uma lista JSON); `atributos` em JSON. Uma linha com o nome de um produto que já está no catálogo atualiza esse produto, para dar para reimportar a planilha corrigida. As linhas com erro não são salvas; `linha` conta o cabeçalho como linha 1, como na planilha.

```json
{ "importados": 12, "erros": [ { "linha": 4, "mensagem": "O preço precisa estar em reais, como 399,90." } ] }
```

Erro `400` quando falta alguma das colunas ou a planilha passa de 1.000 produtos ou 1 MB.

### `GET /api/loja/cupons`

Os cupons da loja (não traz os vouchers do shopping), com quantas compras usaram cada um e o desconto que deram. Vêm primeiro os que valem hoje, os que vencem antes no topo.

```json
{
  "itens": [
    {
      "id": "cp1",
      "titulo": "10% em calçados",
      "tipo": "PERCENTUAL",
      "valor": 10,
      "categoriaAlvo": "calcados",
      "nivelMinimo": "SEMENTE",
      "limitePorCliente": 1,
      "validade": "2026-12-31",
      "ativo": true,
      "usos": 12,
      "descontoCentavos": 62940
    }
  ],
  "total": 4
}
```

`valor` segue o `tipo`: de 1 a 100 em `PERCENTUAL`, centavos em `VALOR` e 0 em `BRINDE`. `validade` é o último dia de uso, em Palmas.

### `POST /api/loja/cupons`

```json
{
  "titulo": "R$ 30 em tênis",
  "tipo": "VALOR",
  "valor": 3000,
  "categoriaAlvo": "calcados",
  "nivelMinimo": "BROTO",
  "limitePorCliente": 1,
  "validade": "2026-12-13"
}
```

Resposta `201` com o cupom, no formato de um item de `GET /api/loja/cupons`. Ele já aparece no atendimento dos clientes do nível. `categoriaAlvo` é uma das categorias do shopping, ou `null` para qualquer uma. Erro `400` (`DADOS_INVALIDOS`: título de 3 a 60 caracteres, valor fora da regra do tipo, limite de 1 a 99, validade antes de hoje, categoria desconhecida).

### `GET /api/loja/relatorios`

Parâmetro `periodo` (`7d`, `30d`, `90d`). Traz `maisVendidos`, `maisBuscados`, `naoEncontrados`, `parados`, `picos` (por dia da semana e hora), `cupons` (usos e desconto), `ticketMedio` (com e sem ficha), `comparativoCategoria` (só com 3 lojas ou mais na categoria, RN13) e `reservas` (o que aconteceu com as reservas feitas no período).

```json
{
  "periodo": "30d",
  "maisVendidos": [ { "produtoId": "p3", "nome": "Camiseta dry-fit Trilha", "quantidade": 41, "valorCentavos": 368590 } ],
  "maisBuscados": [ { "termo": "tênis de corrida", "buscas": 214 } ],
  "naoEncontrados": [ { "termo": "tênis de trilha", "buscas": 120 } ],
  "parados": [ { "produtoId": "p9", "nome": "Jaqueta corta-vento", "estoque": 3, "diasSemVenda": 54 } ],
  "picos": [ { "diaDaSemana": 6, "hora": 17, "compras": 24 } ],
  "cupons": [ { "cupomId": "cp1", "titulo": "10% em calçados", "usos": 12, "descontoCentavos": 62940 } ],
  "ticketMedio": { "comFichaCentavos": 31240, "semFichaCentavos": 18990 },
  "comparativoCategoria": [ { "categoria": "calcados", "ticketMedioLojaCentavos": 34990, "ticketMedioCategoriaCentavos": 29870 } ],
  "reservas": { "feitas": 64, "retiradas": 41, "emAberto": 7, "canceladas": 9, "expiradas": 7 }
}
```

Tudo sai do banco, no período. A compra não guarda os itens: `maisVendidos` conta as retiradas de reserva (a compra ligada a uma reserva diz o produto e a quantidade), e `parados` são os produtos ativos com estoque que não tiveram retirada no período, os parados há mais tempo primeiro (desde a última retirada ou, sem nenhuma, desde o cadastro). `maisVendidos`, `maisBuscados`, `naoEncontrados` e `parados` trazem até 5 linhas. `maisBuscados` são as buscas nas categorias da loja, com ou sem resultado; `naoEncontrados` são buscas nas categorias da loja sem resultado em nenhuma loja do shopping (RN12). `picos` só traz os horários com compra. O ticket médio conta as compras com valor pago maior que zero. `diaDaSemana` vai de 0 (domingo) a 6 e `hora` está em Palmas. `ticketMedio` traz `null` no lado sem compras no período; `comparativoCategoria` vem `null` quando nenhuma categoria da loja tem 3 lojas ativas ou mais (RN13), ou quando não há compras para comparar. O ticket da loja é o mesmo em todas as categorias dela, porque a compra não guarda a categoria. Em `reservas`, `feitas` é a soma das outras quatro.

### `GET /api/loja/extrato`

Parâmetros: `periodo` (`7d`, `30d`, `90d`), `pagina` e `tamanho`. As compras registradas no caixa pela plataforma no período (as que o cliente cadastra por nota fiscal ficam fora), os descontos de cada lado e os reembolsos dos vouchers do shopping (RN11).

```json
{
  "periodo": "30d",
  "resumo": {
    "compras": 19,
    "brutoCentavos": 530620,
    "descontoLojaCentavos": 26938,
    "descontoShoppingCentavos": 10000,
    "pagoCentavos": 493682
  },
  "reembolsos": { "pendenteCentavos": 10000, "pagoNoPeriodoCentavos": 2000 },
  "lancamentos": {
    "itens": [
      {
        "id": "co101",
        "criadoEm": "2026-11-13T06:01:00Z",
        "cliente": "Ana",
        "brutoCentavos": 45980,
        "descontoLojaCentavos": 4598,
        "descontoShoppingCentavos": 2000,
        "pagoCentavos": 39382,
        "retirada": false,
        "reembolso": { "status": "PENDENTE", "pagoEm": null }
      }
    ],
    "total": 19
  }
}
```

`descontoLojaCentavos` é o dos cupons da loja (a loja dá); `descontoShoppingCentavos`, o dos vouchers (o shopping devolve). `reembolsos.pendenteCentavos` é tudo o que falta receber, de qualquer data. `lancamentos` vem da compra mais nova para a mais antiga; `reembolso` é `null` na compra sem voucher. `cliente` é só o primeiro nome.

## Painel do shopping

Todas as rotas exigem o perfil `ADMIN_SHOPPING`.

### `GET /api/shopping/lojas`

As unidades da planta e a loja de cada uma. Unidade vaga é uma loja com `ativa: false` (RF27, "Lojas vagas e demanda"). Parâmetros: `q` (nome ou número da unidade), `situacao` (`ATIVA` ou `VAGA`), `pagina` e `tamanho` (até 200). Ordem: térreo, depois 2º piso, pelo número da unidade.

```json
{
  "itens": [
    {
      "id": "l19",
      "nome": "Loja de esportes",
      "unidade": "LOJA 19",
      "piso": 1,
      "areaM2": 102,
      "tipo": "loja",
      "categorias": ["calcados", "roupas", "acessorios"],
      "mapaId": "loja-19",
      "cnpj": "11222333000101",
      "ativa": true,
      "lojistas": 1
    },
    {
      "id": "l47",
      "nome": "Vaga",
      "unidade": "LOJA 47",
      "piso": 1,
      "areaM2": 229.9,
      "tipo": "loja",
      "categorias": [],
      "mapaId": "loja-47",
      "cnpj": null,
      "ativa": false,
      "lojistas": 0
    }
  ],
  "total": 148
}
```

**De onde vêm `unidade` e `areaM2`:** das colunas `numero` e `area_m2` da tabela `loja` (migration `0003`), que o seed preenche a partir da planilha das lojas (`seed/lojas.csv`). `unidade` é `LOJA ` mais o número; numa unidade gravada sem número, ele sai do `mapa_id` (`loja-47` é a `LOJA 47`). Sem área, a vaga fica fora do cruzamento com a demanda (`GET /api/shopping/vagas`).

### `PUT /api/shopping/lojas/{id}` e `POST /api/shopping/lojas`

O `PUT` ocupa uma vaga, edita a loja ou libera a unidade:

```json
{ "nome": "Eletrônicos do Cerrado", "cnpj": "12345678000190", "tipo": "loja", "categorias": ["eletronicos"], "ativa": true }
```

Com `ativa: true`, o nome (2 a 80 caracteres) e o CNPJ (14 dígitos, aceita pontuação) são obrigatórios, e as categorias filtram a ficha que o lojista vê (RN04). Com `ativa: false`, a unidade volta a ser vaga: nome `Vaga`, sem CNPJ nem categorias, e os lojistas da loja perdem o acesso (as contas deles são apagadas). Os produtos e cupons da loja ficam no banco, mas somem do app, que só mostra lojas ativas. Resposta `200` com a loja. Erros: `400`, `404`, `409` (`CNPJ_EM_USO`). O `POST` cria uma unidade nova e leva, além disso, `unidade` (`"LOJA 150"` ou só `"150"`), `piso`, `areaM2` e `mapaId` (o id do polígono na planta); `ativa: false` cria a unidade vaga. Resposta `201`; unidade ou `mapaId` que já está na planta dá `400`.

### `GET /api/shopping/lojas/{id}/lojistas`

Quem administra a loja: `[ { "id": "u1", "nome": "Equipe da Loja PC01A", "email": "lojista.loja-pc01a@demo.test" } ]`, em ordem de nome.

### `POST /api/shopping/lojistas`

```json
{ "lojaId": "l47", "nome": "Equipe de eletrônicos", "email": "eletronicos@demo.test" }
```

Resposta `201` com o lojista e a `senhaProvisoria`, que só aparece nesta resposta: `{ "id": "u9", "nome": "...", "email": "...", "lojaId": "l47", "senhaProvisoria": "7ds3vrn4gt" }`. A senha tem 10 letras e números, sem os que se confundem; o lojista entra com ela no login único (`/entrar`). Erros: `400`, `404`, `409` (`EMAIL_EM_USO`, o e-mail já tem uma conta, de qualquer perfil), `422` (`LOJA_VAGA`: cadastre a loja na unidade antes do lojista).

### `GET /api/shopping/configuracao` e `PUT`

As regras da fidelidade (tabela `configuracao`):

```json
{
  "niveis": { "SEMENTE": 0, "BROTO": 500, "CAPIM": 2000, "DOURADO": 5000 },
  "pontosPorReal": 1,
  "prazoReservaHoras": { "NA_LOJA": 4, "PIX": 48 }
}
```

O `PUT` recebe o mesmo corpo. Regras: `SEMENTE` é 0 e cada nível precisa de mais pontos que o anterior (RN08); `pontosPorReal` de 1 a 10 (RN07); `NA_LOJA` de 1 a 24 horas e `PIX` de 1 a 168 (RN01, RN02). Valem a partir da próxima compra e da próxima reserva. Erro `400` com a regra que falhou.

### `GET /api/shopping/cupons` e `POST`

Os vouchers do shopping (cupons sem loja), no mesmo formato de `GET /api/loja/cupons`. Aqui `usos` conta as compras com o voucher e `descontoCentavos` é o que o shopping devolveu ou deve às lojas por eles (RN11; um brinde conta o uso com desconto zero). O `POST` recebe o mesmo corpo de `POST /api/loja/cupons`, com `categoriaAlvo` entre todas as categorias do shopping. O voucher criado já vale no atendimento das lojas e aparece na vitrine do app (`GET /api/ofertas`) para os clientes do nível.

### `GET /api/shopping/demanda`

Parâmetro `periodo` (`7d`, `30d`, `90d`). Os termos mais buscados e os buscados sem resultado em nenhuma loja, por categoria, sem identificar clientes (RN12).

```json
{
  "periodo": "30d",
  "buscas": 6840,
  "semResultado": 1412,
  "maisBuscados": [ { "termo": "tênis de corrida", "buscas": 214 } ],
  "semResultadoPorCategoria": [
    { "categoria": "eletronicos", "buscas": 269, "termos": [ { "termo": "fone bluetooth", "buscas": 96 } ] }
  ]
}
```

`semResultadoPorCategoria` vem da categoria com mais buscas sem resultado para a com menos; `semResultado` é a soma delas. As categorias são as do shopping: `calcados`, `roupas`, `acessorios`, `perfumaria`, `eletronicos`, `infantil`, `alimentacao`, `pet`, `casa`, `otica`, `livraria`, `esportes` e `joias`.

### `GET /api/shopping/vagas`

O cruzamento das buscas sem resultado do período (a mesma base de `GET /api/shopping/demanda`) com as unidades vagas que têm área: que tipo de loja buscar para cada vaga. Parâmetro `periodo`.

```json
{
  "periodo": "30d",
  "resumo": { "vagas": 13, "areaTotalM2": 1117.22, "buscasSemResultado": 1412, "buscasComVaga": 1340 },
  "vagas": [
    {
      "id": "l143",
      "unidade": "LOJA 143",
      "piso": 1,
      "areaM2": 116.1,
      "mapaId": "loja-143",
      "sugestao": {
        "categoria": "eletronicos",
        "buscas": 269,
        "termos": [ { "termo": "fone bluetooth", "buscas": 96 } ],
        "encaixe": "IDEAL",
        "motivo": "A unidade serve: 116,1 m² é o tamanho típico de Eletrônicos (60 a 250 m²).",
        "repetida": false
      },
      "alternativas": [ { "categoria": "infantil", "buscas": 187, "encaixe": "IDEAL" } ]
    }
  ],
  "demanda": [
    {
      "categoria": "livraria",
      "buscas": 53,
      "termos": [ { "termo": "livro infantil", "buscas": 28 } ],
      "vagas": [],
      "faixaM2": { "min": 80, "max": 350 },
      "motivoSemVaga": "As vagas do tamanho certo ficaram com categorias mais procuradas."
    }
  ]
}
```

**A regra** (`functions/_lib/regras/vagas.ts`, testada em `tests/unidade/regras/vagas.test.ts` com as 13 vagas da planta):

1. Cada categoria tem uma faixa de área típica e um piso. Hoje: alimentação de 25 a 120 m², só no 2º piso (a praça de alimentação); eletrônicos de 60 a 250; artigos esportivos de 150 a 500; casa e decoração de 100 a 400; livraria de 80 a 350; bebê e brinquedos de 60 a 200; pet shop de 50 a 150; roupas de 40 a 300; calçados de 35 a 120; ótica de 25 a 60; perfumaria de 25 a 90; acessórios de 20 a 60; joias de 20 a 50 (todas no térreo).
2. Encaixe `IDEAL`: a área está na faixa. `POSSIVEL`: até 20% menor que o mínimo ou 25% maior que o máximo.
3. A nota de um par (vaga, categoria) é buscas sem resultado × 1 (ideal) ou 0,6 (possível), × 0,25 para cada vaga que a categoria já ganhou: uma segunda loja do mesmo tipo só entra quando a procura, dividida, ainda ganha das outras.
4. Repete: o par de maior nota entre as vagas livres ganha, até não sobrar par que caiba. No empate, a vaga com a área mais perto do meio da faixa (média geométrica).

`vagas` vem da sugestão mais forte para a mais fraca, com a segunda loja de uma categoria depois e as sem sugestão no fim. `alternativas` são até três outras categorias que cabem, da mais procurada. `buscasComVaga` soma as buscas das categorias que ganharam ao menos uma vaga. Uma unidade ocupada (`PUT` com `ativa: true`) sai do cruzamento na hora.

### `GET /api/shopping/reembolsos`

O que o shopping deve a cada loja pelos vouchers usados nela (RN11). Parâmetro `status` (`PENDENTE` ou `PAGO`; sem ele, todos). Agrupado por loja, a que mais tem a receber primeiro; os reembolsos de cada loja, do mais novo para o mais antigo.

```json
{
  "totais": { "pendenteCentavos": 22500, "lojasComPendencia": 6, "pagoUltimos30DiasCentavos": 10000 },
  "lojas": [
    {
      "loja": { "id": "l19", "nome": "Loja de esportes", "unidade": "LOJA 19" },
      "pendenteCentavos": 8000,
      "pagoCentavos": 8000,
      "itens": [
        {
          "id": "re1",
          "compraId": "co-v8",
          "cupom": { "id": "cp2", "titulo": "R$ 20 do shopping" },
          "centavos": 2000,
          "status": "PENDENTE",
          "criadoEm": "2026-11-09T18:28:00Z",
          "pagoEm": null
        }
      ]
    }
  ]
}
```

Os totais são de todos os reembolsos, qualquer que seja o filtro; `pendenteCentavos` e `pagoCentavos` de cada loja também.

### `PATCH /api/shopping/reembolsos/{id}`

```json
{ "status": "PAGO" }
```

Preenche `pago_em`. Um reembolso pago não volta para pendente: pedir `PAGO` de novo devolve `409` (`TRANSICAO_INVALIDA`), e qualquer outro status, `400`. Resposta `200` com o reembolso, no formato de um item da lista. O extrato da loja (`GET /api/loja/extrato`) passa a mostrar o reembolso como pago.
