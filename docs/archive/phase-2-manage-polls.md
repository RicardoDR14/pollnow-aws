# Ricardo — Phase 2 Manage Polls Checklist

## Objetivo

Esta fase adiciona gestão de sondagens no dashboard privado.

Depois desta fase, o dono de uma poll poderá:

- editar uma poll;
- eliminar uma poll;
- fechar uma poll manualmente;
- continuar a partilhar o link público para votação;
- impedir que outros utilizadores alterem polls que não lhes pertencem.

---

## Branch usada

Estas alterações devem ficar num branch separado:

```bash
phase-2-manage-polls
```

Se a Phase 1 ainda não foi merged para `main`, criar esta branch a partir da Phase 1:

```bash
git checkout phase-1-frontend-auth
git pull
git checkout -b phase-2-manage-polls
```

Se a Phase 1 já foi merged para `main`:

```bash
git checkout main
git pull
git checkout -b phase-2-manage-polls
```

---

## Ficheiros adicionados no backend

Foram adicionadas três novas Lambdas:

```text
backend/lambdas/updatePoll/index.mjs
backend/lambdas/deletePoll/index.mjs
backend/lambdas/closePoll/index.mjs
```

---

## Ficheiros alterados no frontend

Foi alterado:

```text
frontend/src/pages/Home.jsx
```

O dashboard agora inclui botões para:

- `Editar`;
- `Fechar`;
- `Eliminar`;
- `Votar`;
- `Resultados`.

---

## Novas Lambdas a criar na AWS

Criar as seguintes Lambdas na AWS Console:

| Lambda | Runtime | Role |
|---|---|---|
| `updatePoll` | Node.js 22.x | LabRole |
| `deletePoll` | Node.js 22.x | LabRole |
| `closePoll` | Node.js 22.x | LabRole |

Para cada Lambda:

```text
Lambda → Create function → Author from scratch
```

Depois copiar o código correspondente do GitHub:

```text
backend/lambdas/updatePoll/index.mjs
backend/lambdas/deletePoll/index.mjs
backend/lambdas/closePoll/index.mjs
```

Depois clicar em **Deploy**.

---

## Environment variables

### `updatePoll`

| Key | Value |
|---|---|
| `POLLS_TABLE` | `polls` |

### `deletePoll`

| Key | Value |
|---|---|
| `POLLS_TABLE` | `polls` |
| `VOTES_TABLE` | `votes` |

### `closePoll`

| Key | Value |
|---|---|
| `POLLS_TABLE` | `polls` |

---

## API Gateway routes

Adicionar estas rotas:

| Method | Path | Lambda |
|---|---|---|
| `PUT` | `/polls/{pollId}` | `updatePoll` |
| `DELETE` | `/polls/{pollId}` | `deletePoll` |
| `PATCH` | `/polls/{pollId}/close` | `closePoll` |

Rotas públicas existentes continuam:

| Method | Path | Lambda |
|---|---|---|
| `GET` | `/polls/{pollId}` | `getPoll` |
| `POST` | `/polls/{pollId}/vote` | `castVote` |
| `GET` | `/polls/{pollId}/results` | `getResults` |

---

## CORS necessário

Confirmar que API Gateway permite:

| CORS setting | Value |
|---|---|
| Allowed origins | `*` |
| Allowed methods | `GET, POST, PUT, PATCH, DELETE, OPTIONS` |
| Allowed headers | `Content-Type, x-user-id` |

Sem `PUT`, `PATCH`, `DELETE` e `x-user-id`, o frontend pode falhar ao editar, fechar ou eliminar polls.

---

## Segurança / permissões

As novas Lambdas verificam o dono da poll.

Cada request privada envia:

```text
x-user-id: USER_ID_FROM_LOGIN
```

A Lambda compara este valor com:

```text
poll.ownerId
```

Se não coincidir, devolve:

```text
403 Forbidden
```

Isto impede que um utilizador edite, elimine ou feche polls de outro utilizador.

---

## Testes obrigatórios

### 1. Testar editar poll

1. Entrar com um utilizador.
2. Criar uma poll.
3. Clicar em `Editar`.
4. Alterar título, descrição ou opções.
5. Clicar em `Guardar alterações`.

Resultado esperado:

- poll atualizada;
- dashboard mostra os novos dados;
- DynamoDB mostra os valores alterados.

---

### 2. Testar fechar poll

1. Entrar com o dono da poll.
2. Clicar em `Fechar`.
3. Confirmar a ação.

Resultado esperado:

- status muda para `closed`;
- botão `Fechar` desaparece;
- página pública `/vote/{pollId}` deixa de permitir votar.

---

### 3. Testar eliminar poll

1. Entrar com o dono da poll.
2. Clicar em `Eliminar`.
3. Confirmar a ação.

Resultado esperado:

- poll desaparece do dashboard;
- item é removido da tabela `polls`;
- votos associados são removidos da tabela `votes`.

---

### 4. Testar permissões entre utilizadores

1. Criar poll com User 1.
2. Entrar com User 2.
3. Tentar chamar manualmente `PUT /polls/{pollId}` com o pollId do User 1.
4. Tentar chamar manualmente `DELETE /polls/{pollId}`.
5. Tentar chamar manualmente `PATCH /polls/{pollId}/close`.

Resultado esperado:

```text
403 Forbidden
```

---

### 5. Testar link público

Abrir:

```text
/vote/{pollId}
```

Resultado esperado:

- votante consegue ver e votar se a poll estiver aberta;
- votante não vê botões de editar, eliminar ou fechar.

---

## Problemas comuns

### Erro CORS ao editar/eliminar/fechar

Verificar se API Gateway permite:

```text
PUT, PATCH, DELETE
```

e também:

```text
x-user-id
```

---

### Erro 401

Significa que o frontend não enviou:

```text
x-user-id
```

Verificar `localStorage`:

```text
pollnow_user
```

---

### Erro 403

Significa que o utilizador não é dono da poll.

Verificar no DynamoDB:

```text
polls → ownerId
```

e comparar com:

```text
localStorage → pollnow_user.userId
```

---

### Poll eliminada mas votos continuam

Verificar se a Lambda `deletePoll` tem:

```text
VOTES_TABLE=votes
```

---

## Checklist final para Ricardo

Antes de aprovar merge para `main`, confirmar:

- [ ] Branch `phase-2-manage-polls` foi criada.
- [ ] Lambda `updatePoll` foi criada.
- [ ] Lambda `deletePoll` foi criada.
- [ ] Lambda `closePoll` foi criada.
- [ ] `updatePoll` tem `POLLS_TABLE=polls`.
- [ ] `deletePoll` tem `POLLS_TABLE=polls`.
- [ ] `deletePoll` tem `VOTES_TABLE=votes`.
- [ ] `closePoll` tem `POLLS_TABLE=polls`.
- [ ] API Gateway tem `PUT /polls/{pollId}`.
- [ ] API Gateway tem `DELETE /polls/{pollId}`.
- [ ] API Gateway tem `PATCH /polls/{pollId}/close`.
- [ ] CORS permite `PUT`, `PATCH`, `DELETE`.
- [ ] CORS permite `x-user-id`.
- [ ] Editar poll funciona.
- [ ] Fechar poll funciona.
- [ ] Eliminar poll funciona.
- [ ] User 2 não consegue alterar polls do User 1.
- [ ] Link público de votação continua a funcionar.