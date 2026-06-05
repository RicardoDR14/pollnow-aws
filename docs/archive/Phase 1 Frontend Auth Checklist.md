# Phase 1 Frontend Auth Checklist

## Objetivo

Este ficheiro resume o que foi alterado no frontend na Phase 1 e o que precisa de ser confirmado na AWS/Netlify para funcionar corretamente.

Esta fase adiciona:

- página de login;
- página de registo;
- dashboard protegido por utilizador;
- listagem de polls apenas do utilizador autenticado;
- envio do `x-user-id` nas chamadas para a API;
- barra de pesquisa nas polls do utilizador.

---

## Branch usada

Estas alterações devem ficar num branch separado:

```bash
phase-1-frontend-auth
```

Fluxo recomendado:

```bash
git checkout main
git pull
git checkout -b phase-1-frontend-auth
```

Depois das alterações:

```bash
git add .
git commit -m "feat: add frontend auth and user dashboard"
git push -u origin phase-1-frontend-auth
```

Não fazer merge para `main` antes de testar.

---

## Ficheiros adicionados no frontend

Foram adicionados:

```text
frontend/src/pages/Login.jsx
frontend/src/pages/Register.jsx
frontend/.env.example
```

### `Login.jsx`

Responsável por:

- autenticar utilizador com email/username e password;
- chamar `POST /auth/login`;
- guardar o utilizador no `localStorage`;
- redirecionar para `/`.

### `Register.jsx`

Responsável por:

- criar conta com username, email e password;
- chamar `POST /auth/register`;
- guardar o utilizador no `localStorage`;
- redirecionar para `/`.

### `.env.example`

Contém:

```env
REACT_APP_API_URL=https://your-api-gateway-url
```

---

## Ficheiros alterados no frontend

Foram alterados:

```text
frontend/src/App.jsx
frontend/src/components/Navbar.jsx
frontend/src/pages/Home.jsx
```

### `App.jsx`

Foram adicionadas as novas rotas:

```text
/login
/register
```

Rotas públicas existentes continuam:

```text
/vote/:pollId
/results/:pollId
```

---

### `Navbar.jsx`

Agora mostra:

- nome do utilizador autenticado;
- botão `Sair`;
- links para `Entrar` e `Criar conta` quando não há utilizador autenticado.

O logout remove:

```text
pollnow_user
```

do `localStorage`.

---

### `Home.jsx`

Agora funciona como dashboard privado.

Alterações principais:

- se não houver utilizador no `localStorage`, redireciona para `/login`;
- carrega apenas polls do utilizador autenticado;
- envia `x-user-id` no `GET /polls`;
- envia `x-user-id` no `POST /polls`;
- inclui `ownerEmail` e `ownerUsername` ao criar poll;
- adiciona validações extra na criação da poll;
- adiciona campo de descrição;
- adiciona barra de pesquisa.

---

## LocalStorage usado

O frontend guarda o utilizador autenticado em:

```text
pollnow_user
```

Formato esperado:

```json
{
  "userId": "uuid",
  "username": "ruben",
  "email": "ruben@email.com"
}
```

---

## Endpoints necessários na AWS

Para esta fase funcionar, a API Gateway precisa ter estas rotas:

| Method | Path | Lambda |
|---|---|---|
| `POST` | `/auth/register` | `registerUser` |
| `POST` | `/auth/login` | `loginUser` |
| `POST` | `/polls` | `createPoll` |
| `GET` | `/polls` | `listPolls` |

As rotas públicas já existentes continuam:

| Method | Path | Lambda |
|---|---|---|
| `GET` | `/polls/{pollId}` | `getPoll` |
| `POST` | `/polls/{pollId}/vote` | `castVote` |
| `GET` | `/polls/{pollId}/results` | `getResults` |

---

## Headers obrigatórios

As chamadas privadas precisam enviar:

```text
x-user-id: USER_ID_FROM_LOGIN
```

Chamadas privadas:

```text
GET /polls
POST /polls
```

Chamadas públicas, usadas por quem recebe o link da poll:

```text
GET /polls/{pollId}
POST /polls/{pollId}/vote
GET /polls/{pollId}/results
```

Estas não precisam de login.

---

## CORS necessário na API Gateway

Confirmar que CORS permite:

| CORS setting | Value |
|---|---|
| Allowed origins | `*` |
| Allowed methods | `GET, POST, PUT, PATCH, DELETE, OPTIONS` |
| Allowed headers | `Content-Type, x-user-id` |

Sem `x-user-id` em Allowed headers, o frontend pode falhar ao criar/listar polls.

---

## Variável de ambiente no Netlify

Confirmar em Netlify:

```text
Site settings → Environment variables
```

Adicionar ou confirmar:

| Key | Value |
|---|---|
| `REACT_APP_API_URL` | API Gateway Invoke URL |

Exemplo:

```env
REACT_APP_API_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
```

Depois de alterar variáveis no Netlify, fazer novo deploy.

---

## Testes obrigatórios

### 1. Testar registo

Abrir:

```text
/register
```

Criar utilizador:

```text
username: ruben
email: ruben@email.com
password: 123456
```

Resultado esperado:

- conta criada;
- utilizador guardado no `localStorage`;
- redirecionamento para `/`.

---

### 2. Testar login

Abrir:

```text
/login
```

Entrar com:

```text
identifier: ruben@email.com
password: 123456
```

Resultado esperado:

- login bem-sucedido;
- utilizador guardado no `localStorage`;
- redirecionamento para `/`.

---

### 3. Testar dashboard protegido

Abrir:

```text
/
```

Sem login:

- deve redirecionar para `/login`.

Com login:

- deve mostrar `Minhas sondagens`;
- deve permitir criar nova poll.

---

### 4. Testar criação de poll

Criar uma poll com:

```text
título
descrição opcional
2 ou mais opções
data futura
email de notificação
```

Resultado esperado:

- poll criada;
- link de partilha mostrado;
- poll aparece em `Minhas sondagens`.

---

### 5. Testar separação por utilizador

Criar dois utilizadores:

```text
user1@email.com
user2@email.com
```

Teste:

1. Entrar com o user 1.
2. Criar uma poll.
3. Sair.
4. Entrar com o user 2.
5. Confirmar que a poll do user 1 não aparece.

Resultado esperado:

- cada utilizador vê apenas as suas polls.

---

### 6. Testar link público de votação

Copiar o link:

```text
/vote/{pollId}
```

Abrir numa janela anónima/incógnita.

Resultado esperado:

- a poll abre;
- é possível votar;
- não aparece opção de editar, eliminar ou fechar.

---

## Problemas comuns

### Erro 401 ao carregar polls

Causa provável:

```text
x-user-id não está a ser enviado ou o utilizador não está no localStorage
```

Verificar:

```text
localStorage → pollnow_user
```

---

### Erro CORS

Causa provável:

```text
API Gateway não permite o header x-user-id
```

Verificar CORS:

```text
Allowed headers → Content-Type, x-user-id
```

---

### Login/registo falha

Verificar:

- Lambda `registerUser` existe;
- Lambda `loginUser` existe;
- ambas têm `USERS_TABLE=users`;
- tabela `users` existe no DynamoDB;
- API Gateway tem `/auth/register` e `/auth/login`.

---

### Poll criada mas não aparece

Verificar na tabela `polls` se o item tem:

```text
ownerId
ownerEmail
ownerUsername
```

Se não tiver `ownerId`, a poll não aparece no dashboard privado.

---

## Checklist final para Ricardo

Antes de aprovar merge para `main`, confirmar:

- [ ] Branch `phase-1-frontend-auth` foi criada.
- [ ] `Login.jsx` foi adicionado.
- [ ] `Register.jsx` foi adicionado.
- [ ] `App.jsx` tem rotas `/login` e `/register`.
- [ ] `Navbar.jsx` mostra utilizador e logout.
- [ ] `Home.jsx` exige login.
- [ ] `Home.jsx` envia `x-user-id` no `GET /polls`.
- [ ] `Home.jsx` envia `x-user-id` no `POST /polls`.
- [ ] Netlify tem `REACT_APP_API_URL`.
- [ ] API Gateway permite `x-user-id` no CORS.
- [ ] Registo funciona.
- [ ] Login funciona.
- [ ] Criar poll funciona.
- [ ] User 1 não vê polls do User 2.
- [ ] Link público `/vote/{pollId}` funciona sem login.