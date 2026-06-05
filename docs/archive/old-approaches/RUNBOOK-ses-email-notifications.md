# Runbook — PollNow Email Notifications (SNS → SES) — SUPERSEDED

> **This runbook is superseded.** The SES approach was not deployed.
> The current approach uses per-user SNS subscriptions with filter policies.
> See `docs/RUNBOOK-sns-owner-notifications.md`.

---

This runbook contains **everything** needed to move PollNow's poll-result emails
from a single SNS topic to per-owner delivery via Amazon SES, with email
verification handled at registration/login.

## How to use this runbook

Steps are tagged:

- **[CLAUDE CODE]** — repo edits. Hand this file to Claude Code and it can apply
  them directly. Full target file contents are included inline.
- **[MANUAL / AWS]** — actions you perform yourself in the AWS Console / CLI.

Recommended order: backend code → frontend → docs → SES sender → env vars →
IAM → deploy → test. Do the **[MANUAL / AWS]** SES/env/IAM steps *before*
testing, otherwise sends will fail.

## What changes and why

- An SNS topic is a broadcast — every confirmed subscriber gets every message,
  so it cannot target the poll owner. Result emails now go through **SES**,
  which sends to a specific address.
- SES in the Learner Lab runs in **sandbox**, so it only sends to **verified**
  addresses. Verification is a one-time, per-address action, done at
  **registration** on the user's account email.
- The per-poll "notification email" field is **removed**. The recipient is
  always the user's account email, resolved authoritatively from the `users`
  table.
- Admin action notifications (poll created/edited/closed/deleted) stay on SNS.
  Only the **result** email moved to SES.

Flow:

```text
Register  -> registerUser triggers SES verification of the account email
Login     -> loginUser returns emailVerified -> Home shows a banner if false
Poll close-> checkExpired emails results to the owner, only if verified
```

---

## Step 1 — [CLAUDE CODE] Replace `backend/lambdas/registerUser/index.mjs`

Triggers an SES verification email for the account email on signup (best-effort: never fails the registration). Returns `emailVerified` / `verificationStatus`. Requires env vars `USERS_TABLE`, `SES_REGION`.

```js
import {
  DynamoDBClient,
  PutItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import {
  SESClient,
  VerifyEmailIdentityCommand,
  GetIdentityVerificationAttributesCommand,
} from "@aws-sdk/client-ses";
import crypto from "crypto";

const dynamo = new DynamoDBClient({});
const ses = new SESClient({ region: process.env.SES_REGION || "us-east-1" });

function corsResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");

  return `${salt}:${hash}`;
}

// Best-effort: dispara o email de verificacao SES para o endereco da conta.
// Nunca rebenta o registo se o SES falhar -- apenas regista o aviso.
async function requestEmailVerification(email) {
  try {
    const { VerificationAttributes } = await ses.send(
      new GetIdentityVerificationAttributesCommand({ Identities: [email] }),
    );

    const status = VerificationAttributes?.[email]?.VerificationStatus;

    if (status === "Success") {
      return "Success";
    }

    await ses.send(new VerifyEmailIdentityCommand({ EmailAddress: email }));
    console.log(`Pedido de verificacao SES enviado para ${email}.`);
    return "Pending";
  } catch (err) {
    console.warn(`Falha ao pedir verificacao SES para ${email}:`, err.message);
    return "Unknown";
  }
}

export const handler = async (event) => {
  try {
    if (event.requestContext?.http?.method === "OPTIONS") {
      return corsResponse(200, {});
    }

    const body = JSON.parse(event.body || "{}");

    const username = body.username?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!username || !email || !password) {
      return corsResponse(400, {
        error: "Username, email e password sao obrigatorios",
      });
    }

    if (password.length < 6) {
      return corsResponse(400, {
        error: "A password deve ter pelo menos 6 caracteres",
      });
    }

    const existing = await dynamo.send(
      new ScanCommand({
        TableName: process.env.USERS_TABLE,
        FilterExpression: "email = :email OR username = :username",
        ExpressionAttributeValues: {
          ":email": { S: email },
          ":username": { S: username },
        },
      }),
    );

    if ((existing.Items || []).length > 0) {
      return corsResponse(409, {
        error: "Ja existe um utilizador com esse email ou username",
      });
    }

    const userId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const passwordHash = hashPassword(password);

    await dynamo.send(
      new PutItemCommand({
        TableName: process.env.USERS_TABLE,
        Item: {
          userId: { S: userId },
          username: { S: username },
          email: { S: email },
          passwordHash: { S: passwordHash },
          createdAt: { S: createdAt },
        },
      }),
    );

    // Dispara a verificacao SES do email da conta logo no registo.
    const verificationStatus = await requestEmailVerification(email);

    return corsResponse(201, {
      userId,
      username,
      email,
      createdAt,
      emailVerified: verificationStatus === "Success",
      verificationStatus,
    });
  } catch (err) {
    console.error(err);
    return corsResponse(500, {
      error: "Erro ao registar utilizador",
    });
  }
};
```

---

## Step 2 — [CLAUDE CODE] Replace `backend/lambdas/loginUser/index.mjs`

Checks the SES verification status of the account email and returns `emailVerified`. Requires env vars `USERS_TABLE`, `SES_REGION`.

```js
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import {
  SESClient,
  GetIdentityVerificationAttributesCommand,
} from "@aws-sdk/client-ses";
import crypto from "crypto";

const dynamo = new DynamoDBClient({});
const ses = new SESClient({ region: process.env.SES_REGION || "us-east-1" });

function corsResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function verifyPassword(password, storedPasswordHash) {
  if (!storedPasswordHash || !storedPasswordHash.includes(":")) {
    return false;
  }

  const [salt, storedHash] = storedPasswordHash.split(":");

  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");

  return hash === storedHash;
}

// Consulta o estado de verificacao SES do email. Best-effort: se o SES
// falhar, devolve false em vez de partir o login.
async function isEmailVerified(email) {
  try {
    const { VerificationAttributes } = await ses.send(
      new GetIdentityVerificationAttributesCommand({ Identities: [email] }),
    );

    return VerificationAttributes?.[email]?.VerificationStatus === "Success";
  } catch (err) {
    console.warn(`Falha ao consultar estado SES de ${email}:`, err.message);
    return false;
  }
}

export const handler = async (event) => {
  try {
    if (event.requestContext?.http?.method === "OPTIONS") {
      return corsResponse(200, {});
    }

    const body = JSON.parse(event.body || "{}");

    const identifier = body.identifier?.trim().toLowerCase();
    const password = body.password;

    if (!identifier || !password) {
      return corsResponse(400, {
        error: "Email/username e password sao obrigatorios",
      });
    }

    const result = await dynamo.send(
      new ScanCommand({
        TableName: process.env.USERS_TABLE,
        FilterExpression: "email = :identifier OR username = :identifier",
        ExpressionAttributeValues: {
          ":identifier": { S: identifier },
        },
      }),
    );

    const user = (result.Items || [])[0];

    if (!user) {
      return corsResponse(401, {
        error: "Credenciais invalidas",
      });
    }

    const isValid = verifyPassword(password, user.passwordHash.S);

    if (!isValid) {
      return corsResponse(401, {
        error: "Credenciais invalidas",
      });
    }

    const email = user.email.S;
    const emailVerified = await isEmailVerified(email);

    return corsResponse(200, {
      userId: user.userId.S,
      username: user.username.S,
      email,
      emailVerified,
    });
  } catch (err) {
    console.error(err);
    return corsResponse(500, {
      error: "Erro ao iniciar sessao",
    });
  }
};
```

---

## Step 3 — [CLAUDE CODE] Replace `backend/lambdas/createPoll/index.mjs`

Drops the per-poll notification-email field and resolves the owner email from the `users` table (falls back to `body.ownerEmail`). Keeps the SNS admin broadcast. New env var here: `USERS_TABLE`.

```js
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import crypto from "crypto";

const dynamo = new DynamoDBClient({});
const s3 = new S3Client({});
const sns = new SNSClient({ region: process.env.SNS_REGION || "us-east-1" });

const MAX_IMAGE_SIZE_BYTES = 1.5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function corsResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-user-id",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function getVoteUrl(pollId) {
  const frontendUrl = process.env.FRONTEND_URL || "";
  return frontendUrl ? `${frontendUrl}/vote/${pollId}` : `/vote/${pollId}`;
}

async function publishNotification({ subject, message }) {
  if (!process.env.SNS_TOPIC_ARN) {
    console.log("SNS_TOPIC_ARN not configured. Notification skipped.");
    return;
  }

  await sns.send(
    new PublishCommand({
      TopicArn: process.env.SNS_TOPIC_ARN,
      Subject: subject,
      Message: message,
    }),
  );
}

// Resolve o email do dono a partir do registo do user (fonte autoritativa).
// O destinatario das notificacoes e SEMPRE o email da conta -- ja nao se
// pede um email por sondagem.
async function resolveOwnerEmail(ownerId, fallback) {
  if (!process.env.USERS_TABLE) {
    return (fallback || "").trim().toLowerCase();
  }

  try {
    const { Item } = await dynamo.send(
      new GetItemCommand({
        TableName: process.env.USERS_TABLE,
        Key: { userId: { S: ownerId } },
      }),
    );

    const email = Item?.email?.S;
    if (email) {
      return email.trim().toLowerCase();
    }
  } catch (err) {
    console.warn(`Falha ao resolver email do user ${ownerId}:`, err.message);
  }

  return (fallback || "").trim().toLowerCase();
}

function parseImagePayload(body) {
  if (!body.image) {
    return null;
  }

  let base64Image = body.image;
  let contentType = body.imageContentType || "image/jpeg";

  if (typeof base64Image !== "string") {
    throw new Error("Imagem invalida");
  }

  if (base64Image.startsWith("data:")) {
    const match = base64Image.match(/^data:(.+);base64,(.+)$/);

    if (!match) {
      throw new Error("Formato da imagem invalido");
    }

    contentType = match[1];
    base64Image = match[2];
  }

  if (!ALLOWED_IMAGE_TYPES[contentType]) {
    throw new Error("Formato de imagem nao suportado. Usa JPG, PNG ou WEBP");
  }

  const buffer = Buffer.from(base64Image, "base64");

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("A imagem deve ter no maximo 1.5MB");
  }

  return {
    buffer,
    contentType,
    extension: ALLOWED_IMAGE_TYPES[contentType],
  };
}

export const handler = async (event) => {
  try {
    if (event.requestContext?.http?.method === "OPTIONS") {
      return corsResponse(200, {});
    }

    const body = JSON.parse(event.body || "{}");

    const ownerId =
      event.headers?.["x-user-id"] ||
      event.headers?.["X-User-Id"] ||
      body.ownerId;

    if (!ownerId) {
      return corsResponse(401, {
        error: "Utilizador nao autenticado",
      });
    }

    if (!body.title?.trim()) {
      return corsResponse(400, {
        error: "Titulo obrigatorio",
      });
    }

    if (!Array.isArray(body.options) || body.options.length < 2) {
      return corsResponse(400, {
        error: "A sondagem precisa de pelo menos 2 opcoes",
      });
    }

    if (!body.closesAt) {
      return corsResponse(400, {
        error: "Data de fecho obrigatoria",
      });
    }

    const closesAt = new Date(body.closesAt);

    if (Number.isNaN(closesAt.getTime()) || closesAt <= new Date()) {
      return corsResponse(400, {
        error: "A data de fecho tem de ser futura",
      });
    }

    const cleanOptions = body.options
      .map((option) => String(option).trim())
      .filter(Boolean);

    if (cleanOptions.length < 2) {
      return corsResponse(400, {
        error: "A sondagem precisa de pelo menos 2 opcoes validas",
      });
    }

    const lowerOptions = cleanOptions.map((option) => option.toLowerCase());

    if (new Set(lowerOptions).size !== lowerOptions.length) {
      return corsResponse(400, {
        error: "As opcoes nao podem ser repetidas",
      });
    }

    const pollId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const title = body.title.trim();
    const description = body.description?.trim() || "";
    const ownerUsername = body.ownerUsername || "";
    const voteUrl = getVoteUrl(pollId);

    // O destinatario das notificacoes e o email da conta do dono.
    const ownerEmail = await resolveOwnerEmail(ownerId, body.ownerEmail);

    let imageUrl = "";
    let imageKey = "";
    let imageContentType = "";

    const imagePayload = parseImagePayload(body);

    if (imagePayload) {
      imageKey = `banners/${pollId}.${imagePayload.extension}`;
      imageContentType = imagePayload.contentType;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: imageKey,
          Body: imagePayload.buffer,
          ContentType: imagePayload.contentType,
        }),
      );

      imageUrl = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${imageKey}`;
    }

    await dynamo.send(
      new PutItemCommand({
        TableName: process.env.POLLS_TABLE,
        Item: {
          pollId: { S: pollId },
          ownerId: { S: ownerId },
          ownerUsername: { S: ownerUsername },
          ownerEmail: { S: ownerEmail },
          // authorPhone mantido apenas por retrocompatibilidade com lambdas
          // antigos; espelha o ownerEmail.
          authorPhone: { S: ownerEmail },
          title: { S: title },
          description: { S: description },
          options: { L: cleanOptions.map((option) => ({ S: option })) },
          closesAt: { S: closesAt.toISOString() },
          imageUrl: { S: imageUrl },
          imageKey: { S: imageKey },
          imageContentType: { S: imageContentType },
          status: { S: "open" },
          createdAt: { S: createdAt },
        },
      }),
    );

    await publishNotification({
      subject: "PollNow - Nova sondagem criada",
      message:
        `Uma nova sondagem foi criada no PollNow.\n\n` +
        `Titulo: ${title}\n` +
        `Criada por: ${ownerUsername || "N/A"}\n` +
        `Email do dono: ${ownerEmail || "N/A"}\n` +
        `Fecha em: ${closesAt.toISOString()}\n` +
        `Opcoes: ${cleanOptions.join(", ")}\n` +
        `Imagem: ${imageUrl || "Sem imagem"}\n\n` +
        `Link publico para votar:\n${voteUrl}\n\n` +
        `ID da sondagem: ${pollId}`,
    });

    return corsResponse(201, {
      pollId,
      shareUrl: `/vote/${pollId}`,
      imageUrl,
    });
  } catch (err) {
    console.error(err);

    return corsResponse(500, {
      error: err.message || "Erro ao criar sondagem",
    });
  }
};
```

---

## Step 4 — [CLAUDE CODE] Replace `backend/lambdas/checkExpired/index.mjs`

Sends result emails via SES to the owner's account email, only if that address is verified. Keeps the CSV→S3 export and the `notified` status update. Requires env vars `SES_REGION`, `SES_FROM_ADDRESS`; no longer uses `SNS_TOPIC_ARN`/`SNS_REGION`.

```js
import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import {
  SESClient,
  SendEmailCommand,
  GetIdentityVerificationAttributesCommand,
} from "@aws-sdk/client-ses";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const dynamo = new DynamoDBClient({});
const ses = new SESClient({ region: process.env.SES_REGION || "us-east-1" });
const s3 = new S3Client({});

async function isEmailVerified(email) {
  try {
    const { VerificationAttributes } = await ses.send(
      new GetIdentityVerificationAttributesCommand({ Identities: [email] }),
    );

    return VerificationAttributes?.[email]?.VerificationStatus === "Success";
  } catch (err) {
    console.warn(`Falha ao consultar estado SES de ${email}:`, err.message);
    return false;
  }
}

export const handler = async () => {
  try {
    const now = new Date().toISOString();

    const { Items } = await dynamo.send(
      new ScanCommand({
        TableName: process.env.POLLS_TABLE,
        FilterExpression: "#s = :open AND closesAt < :now",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: {
          ":open": { S: "open" },
          ":now": { S: now },
        },
      }),
    );

    for (const poll of Items || []) {
      const pollId = poll.pollId.S;
      const title = poll.title.S;
      const options = poll.options.L.map((o) => o.S);
      const ownerEmail = (
        poll.ownerEmail?.S ||
        poll.authorPhone?.S ||
        ""
      ).trim();

      // Buscar votos desta sondagem
      const { Items: votes } = await dynamo.send(
        new ScanCommand({
          TableName: process.env.VOTES_TABLE,
          FilterExpression: "pollId = :pollId",
          ExpressionAttributeValues: { ":pollId": { S: pollId } },
        }),
      );

      // Agregar votos
      const counts = {};
      options.forEach((o) => (counts[o] = 0));
      (votes || []).forEach((v) => {
        const opt = v.option.S;
        if (counts[opt] !== undefined) counts[opt]++;
      });

      const total = (votes || []).length;
      const resultLines = options
        .map(
          (o) =>
            `${o}: ${counts[o]} votos (${total > 0 ? Math.round((counts[o] / total) * 100) : 0}%)`,
        )
        .join("\n");

      // Gerar CSV e guardar no S3 (nota extra)
      const csvLines = [
        "Opcao,Votos,Percentagem",
        ...options.map(
          (o) =>
            `${o},${counts[o]},${total > 0 ? Math.round((counts[o] / total) * 100) : 0}%`,
        ),
      ];
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: `results/${pollId}.csv`,
          Body: csvLines.join("\n"),
          ContentType: "text/csv",
        }),
      );

      // Enviar email de resultados via SES para o email do dono.
      // So envia se o endereco estiver verificado no SES.
      if (ownerEmail && (await isEmailVerified(ownerEmail))) {
        await ses.send(
          new SendEmailCommand({
            Source: process.env.SES_FROM_ADDRESS,
            Destination: { ToAddresses: [ownerEmail] },
            Message: {
              Subject: { Data: `Sondagem "${title}" fechou!` },
              Body: {
                Text: {
                  Data:
                    `A tua sondagem "${title}" fechou!\n\n` +
                    `Resultados:\n${resultLines}\n\n` +
                    `Total: ${total} participantes.`,
                },
              },
            },
          }),
        );
        console.log(`Email enviado para ${ownerEmail} -- sondagem ${pollId}.`);
      } else {
        console.warn(
          `Sondagem ${pollId}: ${ownerEmail || "sem email"} nao verificado no SES -- email nao enviado.`,
        );
      }

      // Marcar como notificada (independentemente do envio, para nao reprocessar)
      await dynamo.send(
        new UpdateItemCommand({
          TableName: process.env.POLLS_TABLE,
          Key: { pollId: { S: pollId } },
          UpdateExpression: "SET #s = :notified",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":notified": { S: "notified" } },
        }),
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ processed: (Items || []).length }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
```

---

## Step 5 — [CLAUDE CODE] Frontend: remove the notification-email field, add the verification banner

File: `frontend/src/pages/Home.jsx`

**5a. Remove the notification-email validation** — delete this block:

```jsx
    if (!form.authorPhone.trim()) {
      return "Email obrigatório para notificação";
    }

    if (!form.authorPhone.includes("@")) {
      return "Email inválido";
    }
```

**5b. Remove the notification-email input** — delete this `form-field`:

```jsx
          <div className="form-field">
            <label>Email para notificação</label>
            <input
              placeholder="Ex: autor@email.com"
              value={form.authorPhone}
              onChange={(e) =>
                setForm({ ...form, authorPhone: e.target.value })
              }
            />
          </div>
```

**5c. Add the verification banner** — in the main `return (`, immediately after
the opening `<div>` (just before `<section className="dashboard-hero">`),
insert:

```jsx
      {user?.email && user.emailVerified === false && (
        <div className="banner banner-info">
          Enviámos um email de confirmação para <strong>{user.email}</strong>.
          Confirma-o para receberes os resultados das tuas sondagens por email.
        </div>
      )}
```

**5d. Optional cleanup** — `authorPhone` is now ignored by the backend, so the
remaining `authorPhone` references (in `emptyForm`, the `useEffect` prefill,
and the create/update payloads) are harmless. They can be removed for tidiness,
but leaving them does not break anything. The `ownerEmail: user.email` keys in
the payloads can stay (used only as a fallback).

> No CSS is strictly required; if `.banner` / `.banner-info` are not styled,
> add a small rule to `App.css` (a padded box with a light background).

---

## Step 6 — [CLAUDE CODE] Keep the docs coherent

The new authoritative document is `docs/email-notifications-ses.md`. Two earlier
phase docs now contain statements that are no longer true; add a supersession
note at the **top** of each (do not rewrite their bodies — they are historical
phase records).

**6a.** At the top of `docs/phase-5-sns-action-notifications.md`, add:

```md
> **Note (superseded in part):** Poll **result** emails no longer use SNS.
> They are sent per-owner via Amazon SES — see
> `docs/email-notifications-ses.md`. The admin action notifications
> (created/edited/closed/deleted) described below remain on SNS and are still accurate.
```

**6b.** At the top of `docs/phase-7-optional-poll-images.md`, add:

```md
> **Note (superseded in part):** The per-poll "notification email" field
> described here has been removed. The notification recipient is now the user's
> account email, verified once at registration — see
> `docs/email-notifications-ses.md`.
```

---

## Step 7 — [MANUAL / AWS] Verify the SES sender and confirm sandbox

The `SES_FROM_ADDRESS` (the `Source` of every result email) must be verified:

```text
AWS Console → Amazon SES → Verified identities → Create identity
→ Email address → enter the sender address → confirm the link in that inbox
```

Confirm sandbox state:

```bash
aws sesv2 get-account --query "ProductionAccessEnabled"
```

`false` = sandbox (only verified addresses receive email). Expected in the
Learner Lab — the registration verification flow handles this.

---

## Step 8 — [MANUAL / AWS] Set Lambda environment variables

| Lambda | Variables to set |
|---|---|
| `registerUser` | `USERS_TABLE=users`, `SES_REGION=us-east-1` |
| `loginUser` | `USERS_TABLE=users`, `SES_REGION=us-east-1` |
| `createPoll` | keep `POLLS_TABLE`, `S3_BUCKET`, `SNS_REGION`, `SNS_TOPIC_ARN`, `FRONTEND_URL`; **add** `USERS_TABLE=users` |
| `checkExpired` | `POLLS_TABLE=polls`, `VOTES_TABLE=votes`, `S3_BUCKET=<bucket>`, `SES_REGION=us-east-1`, `SES_FROM_ADDRESS=<verified sender>`; remove `SNS_TOPIC_ARN`/`SNS_REGION` |

---

## Step 9 — [MANUAL / AWS] Grant SES permissions to LabRole

Add to the Lambda execution role (alongside existing DynamoDB/S3/SNS):

| Action | Used by |
|---|---|
| `ses:VerifyEmailIdentity` | `registerUser` |
| `ses:GetIdentityVerificationAttributes` | `registerUser`, `loginUser`, `checkExpired` |
| `ses:SendEmail` | `checkExpired` |

In the Learner Lab, `LabRole` is usually permissive enough. If a send "succeeds
in code but nothing arrives", check this first.

---

## Step 10 — [MANUAL / AWS] Deploy and confirm the trigger

Deploy the four updated Lambdas (paste each `index.mjs` in the console and click
**Deploy**, or use your existing deploy flow).

The EventBridge rule is unchanged (`pollnow-check-expired`, `rate(5 minutes)`,
target `checkExpired`). If `checkExpired` is never invoked (no logs), confirm
the invoke permission:

```bash
aws lambda get-policy --function-name checkExpired
```

If empty:

```bash
aws lambda add-permission \
  --function-name checkExpired \
  --statement-id eventbridge-invoke \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-east-1:ACCOUNT_ID:rule/pollnow-check-expired
```

---

## Step 11 — [MANUAL] Test end to end

1. **Register** a new user with a real email → an AWS verification email arrives
   (check spam). Click the link.
   ```bash
   aws ses get-identity-verification-attributes --identities EMAIL
   ```
   should show `VerificationStatus: Success`.
2. **Login** before confirming → `emailVerified: false` → banner shown. Confirm,
   login again → `emailVerified: true` → banner gone.
3. **Create** a poll closing a few minutes ahead, cast a couple of votes, wait
   for close + up to 5 min.
   ```bash
   aws logs tail /aws/lambda/checkExpired --since 15m
   ```
   Expect `Email enviado para ...` and `processed: N`. The owner inbox gets the
   results; `results/<pollId>.csv` appears in S3; poll status becomes `notified`.

---

## Combined final checklist

Repo (Claude Code):

- [ ] `registerUser`, `loginUser`, `createPoll`, `checkExpired` replaced.
- [ ] `Home.jsx`: notification-email field + validation removed; banner added.
- [ ] Supersession notes added to `phase-5` and `phase-7`.

AWS (manual):

- [ ] SES sender verified; `SES_FROM_ADDRESS` set.
- [ ] `USERS_TABLE` added to `registerUser`, `loginUser`, `createPoll`.
- [ ] `SES_REGION` on `registerUser`, `loginUser`, `checkExpired`.
- [ ] LabRole has the three SES actions.
- [ ] Four Lambdas deployed.
- [ ] Registration sends a verification email; login returns the right status;
      a closed poll emails results to the verified owner.
