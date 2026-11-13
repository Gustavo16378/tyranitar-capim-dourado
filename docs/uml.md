# UML

Diagramas do sistema em Mermaid. Eles aparecem desenhados no GitHub e nos PDFs da documentação. Os códigos RF e RN são os de [requisitos.md](requisitos.md).

## Casos de uso

Os casos de uso estão divididos por perfil para caberem na leitura. A Capi usa o Claude (IA da Anthropic) como sistema externo.

### Cliente: descobrir e reservar

```mermaid
flowchart LR
  cliente(["Cliente"])
  claude(["Claude (IA)"])
  subgraph app["App do cliente"]
    uc02(["RF02 Conversar com a Capi"])
    uc03(["RF03 Enviar foto ou print"])
    uc04(["RF04 Enviar link"])
    ucid(["Identificar o produto"])
    uc05(["RF05 Buscar produtos"])
    uc07(["RF07 Ver produto"])
    uc08(["RF08 Reservar e pagar na loja"])
    uc09(["RF09 Reservar com Pix"])
    uc10(["RF10 Ver mapa e rota"])
  end
  cliente --- uc02 & uc05 & uc07
  uc02 -. extend .-> uc03 & uc04
  uc03 & uc04 -. include .-> ucid
  uc02 & ucid --- claude
  uc07 -. extend .-> uc08 & uc09
  uc08 & uc09 -. extend .-> uc10
```

### Cliente: conta, carteira e ofertas

```mermaid
flowchart LR
  cliente(["Cliente"])
  subgraph app["App do cliente"]
    uc01(["RF01 Cadastrar-se e entrar"])
    uc06(["RF06 Ver vitrine de ofertas"])
    uc11(["RF11 Ver carteira"])
    uc12(["RF12 Registrar nota fiscal"])
    uc13(["RF13 Gerir consentimento da ficha"])
    uc14(["RF14 Ver notificações"])
    uc15(["RF15 Avaliar produto"])
    uc16(["RF16 Favoritos e histórico"])
  end
  cliente --- uc01 & uc06 & uc11 & uc13 & uc14 & uc16
  uc11 -. extend .-> uc12
  uc16 -. extend .-> uc15
```

### Lojista

```mermaid
flowchart LR
  lojista(["Lojista"])
  subgraph painel["Painel da loja"]
    uc17(["RF17 Entrar no painel"])
    uc18(["RF18 Atender cliente pelo QR"])
    ucficha(["Ver ficha filtrada"])
    uc19(["RF19 Registrar compra no caixa"])
    uccupom(["Aplicar cupons"])
    uc20(["RF20 Gerir reservas"])
    uc21(["RF21 Cadastrar produtos"])
    uc22(["RF22 Importar planilha CSV"])
    uc23(["RF23 Criar cupons"])
    uc24(["RF24 Ver relatórios"])
    uc25(["RF25 Ver extrato"])
  end
  lojista --- uc17 & uc18 & uc20 & uc21 & uc23 & uc24 & uc25
  uc18 -. include .-> ucficha
  uc18 -. extend .-> uc19
  uc19 -. extend .-> uccupom
  uc21 -. extend .-> uc22
```

### Administração do shopping

```mermaid
flowchart LR
  admin(["Administração do shopping"])
  subgraph painel["Painel do shopping"]
    uc27(["RF27 Cadastrar lojas e lojistas"])
    uc28(["RF28 Configurar fidelidade e campanhas"])
    uc29(["RF29 Ver demanda"])
    uc30(["RF30 Ver jornada e gasto por cliente"])
    uc31(["RF31 Pagar reembolsos"])
  end
  admin --- uc27 & uc28 & uc29 & uc30 & uc31
```

## Diagrama de classes

O modelo de domínio está em três diagramas: pessoas e lojas; reserva, compra e cupons; e conversa, buscas e avaliações. Valores em dinheiro são inteiros em centavos.

### Pessoas, lojas e catálogo

```mermaid
classDiagram
  direction TB
  class Usuario {
    +id: string
    +nome: string
    +email: string
    -senhaHash: string
    +perfil: Perfil
  }
  class Cliente {
    +qrToken: string
    +pontos: int
    +consentimentoFicha: boolean
    +nivel() Nivel
  }
  class Lojista {
    +lojaId: string
  }
  class AdminShopping
  class Loja {
    +id: string
    +nome: string
    +cnpj: string
    +piso: int
    +tipo: TipoLoja
    +categorias: string[]
    +mapaId: string
    +ativa: boolean
  }
  class Produto {
    +id: string
    +nome: string
    +descricao: string
    +categoria: string
    +precoCentavos: int
    +estoque: int
    +fotos: string[]
    +atributos: Map
    +ativo: boolean
  }
  class Ficha {
    +interesses: Interesse[]
    +atualizadoEm: datetime
    +filtrarPara(loja) Ficha
  }
  class Perfil {
    <<enumeration>>
    CLIENTE
    LOJISTA
    ADMIN_SHOPPING
  }
  class Nivel {
    <<enumeration>>
    SEMENTE
    BROTO
    CAPIM
    DOURADO
  }
  Usuario <|-- Cliente
  Usuario <|-- Lojista
  Usuario <|-- AdminShopping
  Lojista "*" --> "1" Loja : trabalha em
  Loja "1" *-- "*" Produto : vende
  Cliente "1" *-- "0..1" Ficha : tem
```

### Reserva, compra e cupons

```mermaid
classDiagram
  direction TB
  class Reserva {
    +quantidade: int
    +precoCentavos: int
    +status: StatusReserva
    +formaPagamento: FormaPagamento
    +pago: boolean
    +expiraEm: datetime
    +confirmar()
    +separar()
    +retirar()
    +cancelar()
    +expirou(agora) boolean
  }
  class Compra {
    +valorCentavos: int
    +origem: OrigemCompra
    +chaveNfce: string
    +pontosGerados: int
  }
  class UsoCupom {
    +descontoCentavos: int
  }
  class Cupom {
    +titulo: string
    +tipo: TipoCupom
    +valor: int
    +limitePorCliente: int
    +validade: date
    +doShopping() boolean
    +calcularDesconto(valorCentavos) int
  }
  class Reembolso {
    +valorCentavos: int
    +status: StatusReembolso
  }
  Cliente "1" --> "*" Reserva : faz
  Reserva "*" --> "1" Produto : de
  Cliente "1" --> "*" Compra : faz
  Compra "*" --> "1" Loja : em
  Compra "0..1" --> "0..1" Reserva : retira
  Compra "1" *-- "*" UsoCupom : aplica
  UsoCupom "*" --> "1" Cupom : usa
  Loja "0..1" --> "*" Cupom : emite
  UsoCupom "1" --> "0..1" Reembolso : gera
  Reembolso "*" --> "1" Loja : para
```

### Conversa, buscas e avaliações

```mermaid
classDiagram
  direction LR
  class Mensagem {
    +papel: Papel
    +conteudo: string
    +criadoEm: datetime
  }
  class Busca {
    +termo: string
    +categoria: string
    +encontrou: boolean
  }
  class Avaliacao {
    +nota: int
    +comentario: string
  }
  Cliente "1" *-- "*" Mensagem : conversa
  Cliente "0..1" --> "*" Busca : faz
  Cliente "1" --> "*" Avaliacao : escreve
  Avaliacao "*" --> "1" Produto : sobre
  Avaliacao "*" --> "1" Compra : comprovada por
```

Os estados da reserva estão no diagrama de estados, no fim deste documento.

Um cupom sem loja (`lojaId` nulo) é um voucher do shopping (RN11).

## Diagramas de sequência

### Busca por foto (RF03)

```mermaid
sequenceDiagram
  autonumber
  actor C as Cliente
  participant A as App (PWA)
  participant F as API (Functions)
  participant IA as Claude
  participant DB as D1
  C->>A: Envia o print de um tênis
  A->>F: POST /api/chat<br/>(imagem em base64)
  F->>DB: Últimas mensagens
  F->>IA: Mensagens + imagem + tools
  IA-->>F: tool_use buscar_similares<br/>(categoria, cor, marca)
  F->>DB: Produtos ativos<br/>da categoria
  F->>IA: tool_result com os candidatos
  IA-->>F: Texto + produtos escolhidos
  F->>DB: Grava mensagens<br/>e busca sem resultado
  F-->>A: Resposta com cards de produto
```

### Reserva com Pix e rota (RF09, RF10)

```mermaid
sequenceDiagram
  autonumber
  actor C as Cliente
  participant A as App (PWA)
  participant F as API (Functions)
  participant DB as D1
  C->>A: Reserva com Pix
  A->>F: POST /api/reservas<br/>(produtoId, PIX)
  F->>DB: Estoque - 1<br/>e reserva PENDENTE
  F-->>A: Reserva + QR do Pix simulado
  A->>F: POST /api/reservas/{id}/pagamento
  F->>DB: pago = 1<br/>expira em 48 h (RN02)
  F-->>A: Reserva paga
  A-->>C: Mapa com a rota até a loja
```

### Atendimento com QR e compra no caixa (RF18, RF19)

```mermaid
sequenceDiagram
  autonumber
  actor V as Vendedor
  participant P as Painel da loja
  participant F as API (Functions)
  participant DB as D1
  V->>P: Lê o QR do cliente com a câmera
  P->>F: GET /api/loja/atendimento/{qr}
  F->>F: Valida o JWT (perfil LOJISTA)
  F->>DB: Cliente, reservas,<br/>cupons e ficha
  F->>F: Filtra a ficha pelas<br/>categorias da loja (RN04)
  F-->>P: Ficha, reservas e cupons
  V->>P: Informa o valor e os cupons
  P->>F: POST /api/loja/compras
  F->>F: Valida os cupons<br/>(RN05, RN06)
  F->>DB: Transação: compra, cupons,<br/>pontos, reembolso e<br/>reserva RETIRADA
  F-->>P: Recibo com desconto e pontos
  F-)DB: Notificação ao cliente
```

### Registro por nota fiscal (RF12)

```mermaid
sequenceDiagram
  autonumber
  actor C as Cliente
  participant A as App (PWA)
  participant F as API (Functions)
  participant DB as D1
  C->>A: Lê o QR da NFC-e e informa o valor
  A->>F: POST /api/me/notas<br/>(url do QR, valor)
  F->>F: Extrai a chave (44 dígitos)<br/>e o CNPJ (dígitos 7 a 20)
  F->>DB: Chave já usada?<br/>CNPJ de loja do shopping?
  alt Nota válida
    F->>DB: Compra (origem NOTA)<br/>e pontos
    F-->>A: Compra registrada e pontos
  else Nota repetida ou loja fora do shopping
    F-->>A: Erro 409 ou 422 (RN09)
  end
```

Na versão atual do QR da NFC-e, o valor da compra não vem no código. O cliente informa o valor e ele aparece no extrato da loja. Em produção, o valor pode ser confirmado pela consulta pública da Sefaz.

## Diagrama de estados da reserva

```mermaid
stateDiagram-v2
  [*] --> Pendente : cliente reserva (estoque - 1)
  Pendente --> Confirmada : loja confirma
  Confirmada --> Separada : loja separa o produto
  Pendente --> Separada : loja separa direto
  Separada --> Retirada : QR lido no balcão
  Confirmada --> Retirada : QR lido no balcão
  Pendente --> Cancelada : cliente ou loja cancela
  Confirmada --> Cancelada : cliente ou loja cancela
  Separada --> Cancelada : cliente ou loja cancela
  Pendente --> Expirada : prazo vencido (RN01, RN02)
  Confirmada --> Expirada : prazo vencido
  Separada --> Expirada : prazo vencido
  Cancelada --> [*] : estoque + 1
  Expirada --> [*] : estoque + 1
  Retirada --> [*]
```

A expiração é conferida sempre que uma reserva é lida, porque Pages Functions não roda tarefas agendadas.
