import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
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
        error: "Email/username e password são obrigatórios",
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
        error: "Credenciais inválidas",
      });
    }

    const isValid = verifyPassword(password, user.passwordHash.S);

    if (!isValid) {
      return corsResponse(401, {
        error: "Credenciais inválidas",
      });
    }

    return corsResponse(200, {
      userId: user.userId.S,
      username: user.username.S,
      email: user.email.S,
    });
  } catch (err) {
    console.error(err);
    return corsResponse(500, {
      error: "Erro ao iniciar sessão",
    });
  }
};
