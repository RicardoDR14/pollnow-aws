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
