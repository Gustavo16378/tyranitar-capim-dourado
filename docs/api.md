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
| 409 | Conflito com o estado atual: sem estoque, nota repetida, reserva já retirada (`SEM_ESTOQUE`, `NOTA_REPETIDA`, `TRANSICAO_INVALIDA`) |
| 422 | Regra de negócio violada: cupom inválido, combinação proibida, loja fora do shopping (`CUPOM_INVALIDO`, `CUPONS_INCOMPATIVEIS`, `LOJA_NAO_CADASTRADA`) |
| 503 | A IA não respondeu (`IA_INDISPONIVEL`); o app mostra a busca comum |

**Paginação:** listas aceitam `?pagina=1&tamanho=20` e respondem `{ "itens": [...], "total": 42 }`.

## Resumo das rotas

| Método e rota | Perfil | Requisito |
| --- | --- | --- |
| `POST /api/auth/cadastro` | Público | RF01 |
| `POST /api/auth/login` | Público | RF01, RF17 |
| `POST /api/auth/demo` | Público | RF01 |
| `GET /api/lojas` | Público | RF07, RF10 |
| `GET /api/produtos` | Público | RF05 |
| `GET /api/produtos/{id}` | Público | RF07 |
| `GET /api/ofertas` | Público | RF06 |
| `POST /api/chat` | CLIENTE | RF02, RF03, RF04 |
| `GET /api/chat` | CLIENTE | RF02 |
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
| `POST /api/loja/compras` | LOJISTA | RF19 |
| `GET /api/loja/reservas` | LOJISTA | RF20 |
| `PATCH /api/loja/reservas/{id}` | LOJISTA | RF20 |
| `GET /api/loja/produtos`, `POST`, `PUT /{id}` | LOJISTA | RF21 |
| `POST /api/loja/produtos/importar` | LOJISTA | RF22 |
| `GET /api/loja/cupons`, `POST` | LOJISTA | RF23 |
| `GET /api/loja/relatorios` | LOJISTA | RF24 |
| `GET /api/loja/extrato` | LOJISTA | RF25 |
| `GET /api/shopping/lojas`, `POST`, `PUT /{id}` | ADMIN_SHOPPING | RF27 |
| `POST /api/shopping/lojistas` | ADMIN_SHOPPING | RF27 |
| `GET /api/shopping/configuracao`, `PUT` | ADMIN_SHOPPING | RF28 |
| `POST /api/shopping/cupons` | ADMIN_SHOPPING | RF28 |
| `GET /api/shopping/demanda` | ADMIN_SHOPPING | RF29 |
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

### `POST /api/auth/demo`

Entra com a conta de demonstração, a cliente Ana do seed, sem senha. É o botão "Entrar com a conta de demonstração" da tela de login, para a banca testar o app sem cadastro. Não tem corpo.

Só existe com o modo demonstração ligado nas Functions (`DEMO=1`, veja o README). Sempre devolve um token de `CLIENTE`: não abre os painéis.

Resposta `200`: o mesmo formato do login, com o token da Ana (perfil `CLIENTE`, vale 12 horas como qualquer outro). Erro `404` (`NAO_ENCONTRADO`) com `DEMO` desligado ou se a conta de demonstração não estiver no banco.

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

As últimas 50 mensagens do cliente, para reabrir a conversa: `{ "itens": [ { "id", "papel": "CLIENTE" | "CAPI", "conteudo", "criadoEm" } ], "total" }`, da mais antiga para a mais nova. Fotos não são guardadas: a mensagem aparece como `[foto]`.

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
  "reservas": [ { "id": "r1", "produto": "Tênis de corrida Pulse", "status": "SEPARADA", "pago": true } ],
  "cupons": [ { "id": "cp1", "titulo": "10% em calçados", "origem": "LOJA" }, { "id": "cp2", "titulo": "R$ 20 do shopping", "origem": "SHOPPING" } ]
}
```

`ficha` vem vazia quando o cliente não deu consentimento, e só traz as categorias que a loja vende (RN04).

### `POST /api/loja/compras`

```json
{ "qrToken": "q-7f3a...", "valorCentavos": 45980, "cupons": ["cp1", "cp2"] }
```

Para registrar a retirada de uma reserva, envie também `reservaId`. Se ela foi paga por Pix, a compra entra com o valor da reserva, o caixa não cobra de novo e os pontos são somados na retirada.

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

### `POST /api/loja/compras/previa`

O mesmo corpo de `POST /api/loja/compras`, mas não grava nada: devolve `valorBrutoCentavos`, `descontos`, `valorPagoCentavos`, `pontosGerados` e `reembolsoGerado` (sem `id`), com os mesmos erros. Serve para o caixa mostrar "Cliente paga" enquanto o vendedor marca os cupons.

### `GET /api/loja/reservas`

Parâmetros `status` (um ou mais, separados por vírgula; padrão: todos), `pagina` e `tamanho`. As que vencem primeiro vêm na frente. Cada item: `{ id, produto, cliente, quantidade, status, formaPagamento, pago, precoCentavos, expiraEm, criadoEm }`, com o cliente só pelo primeiro nome e `precoCentavos` pelo total da reserva. Reservas vencidas já vêm `EXPIRADA`, com o estoque devolvido.

### `PATCH /api/loja/reservas/{id}`

```json
{ "status": "SEPARADA" }
```

Segue as transições do diagrama de estados. Uma transição proibida devolve `409` (`TRANSICAO_INVALIDA`). A loja pode pedir `CONFIRMADA`, `SEPARADA`, `RETIRADA` e `CANCELADA`; cancelar devolve o estoque e separar avisa o cliente. Reserva de outra loja: `403`. Resposta: a reserva no formato da lista.

### `POST /api/loja/produtos/importar`

Recebe um CSV (`text/csv`) com as colunas `nome,descricao,categoria,preco,estoque,fotos,atributos`. O preço vai em reais com vírgula ou ponto; `atributos` em JSON. Resposta com `importados` e a lista de `erros` por linha, sem salvar as linhas com erro.

### `GET /api/loja/relatorios`

Parâmetro `periodo` (`7d`, `30d`, `90d`). Traz `maisVendidos`, `maisBuscados`, `naoEncontrados`, `parados`, `picos` (por dia da semana e hora), `cupons` (usos e desconto), `ticketMedio` (com e sem ficha) e `comparativoCategoria` (só com 3 lojas ou mais na categoria, RN13).

## Painel do shopping

### `GET /api/shopping/demanda`

Parâmetro `periodo`. Traz os termos mais buscados e os buscados sem resultado em nenhuma loja, por categoria, sem identificar clientes (RN12).

### `PATCH /api/shopping/reembolsos/{id}`

```json
{ "status": "PAGO" }
```

Preenche `pago_em`. Um reembolso pago não volta para pendente.
