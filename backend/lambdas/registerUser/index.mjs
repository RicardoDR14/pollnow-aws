import {
  DynamoDBClient,
  PutItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import crypto from "crypto";

const dynamo = new DynamoDBClient({});

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
        error: "Username, email e password são obrigatórios",
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
        error: "Já existe um utilizador com esse email ou username",
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

    return corsResponse(201, {
      userId,
      username,
      email,
      createdAt,
    });
  } catch (err) {
    console.error(err);
    return corsResponse(500, {
      error: "Erro ao registar utilizador",
    });
  }
};
