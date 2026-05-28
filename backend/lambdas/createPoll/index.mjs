import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const dynamo = new DynamoDBClient({});
const s3 = new S3Client({});

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
        error: "Utilizador não autenticado",
      });
    }

    if (!body.title?.trim()) {
      return corsResponse(400, {
        error: "Título obrigatório",
      });
    }

    if (!Array.isArray(body.options) || body.options.length < 2) {
      return corsResponse(400, {
        error: "A sondagem precisa de pelo menos 2 opções",
      });
    }

    if (!body.closesAt) {
      return corsResponse(400, {
        error: "Data de fecho obrigatória",
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
        error: "A sondagem precisa de pelo menos 2 opções válidas",
      });
    }

    const lowerOptions = cleanOptions.map((option) => option.toLowerCase());
    if (new Set(lowerOptions).size !== lowerOptions.length) {
      return corsResponse(400, {
        error: "As opções não podem ser repetidas",
      });
    }

    const pollId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    let imageUrl = "";

    if (body.image) {
      const buffer = Buffer.from(body.image, "base64");
      const key = `banners/${pollId}.jpg`;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: "image/jpeg",
        }),
      );

      imageUrl = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
    }

    await dynamo.send(
      new PutItemCommand({
        TableName: process.env.POLLS_TABLE,
        Item: {
          pollId: { S: pollId },
          ownerId: { S: ownerId },
          ownerUsername: { S: body.ownerUsername || "" },
          ownerEmail: { S: body.ownerEmail || body.authorPhone || "" },
          title: { S: body.title.trim() },
          description: { S: body.description?.trim() || "" },
          options: { L: cleanOptions.map((option) => ({ S: option })) },
          closesAt: { S: closesAt.toISOString() },
          authorPhone: { S: body.authorPhone || body.ownerEmail || "" },
          imageUrl: { S: imageUrl },
          status: { S: "open" },
          createdAt: { S: createdAt },
        },
      }),
    );

    return corsResponse(201, {
      pollId,
      shareUrl: `/vote/${pollId}`,
    });
  } catch (err) {
    console.error(err);

    return corsResponse(500, {
      error: "Erro ao criar sondagem",
    });
  }
};
