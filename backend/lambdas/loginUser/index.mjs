import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import {
  SNSClient,
  GetSubscriptionAttributesCommand,
} from "@aws-sdk/client-sns";
import crypto from "node:crypto";

const dynamo = new DynamoDBClient({});
const sns = new SNSClient({ region: process.env.SNS_REGION || "us-east-1" });

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
  if (!storedPasswordHash?.includes(":")) {
    return false;
  }

  const [salt, storedHash] = storedPasswordHash.split(":");

  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");

  return hash === storedHash;
}

// Determina o estado da subscricao SNS do user:
//   "off"     -> sem notificationSubArn
//   "pending" -> ARN e "pending confirmation" (ainda nao confirmado)
//   "on"      -> ARN real confirmado
async function getNotificationStatus(user) {
  const subArn = user.notificationSubArn?.S;

  if (!subArn) return "off";
  if (subArn === "pending confirmation") return "pending";

  if (subArn.startsWith("arn:aws:sns")) {
    try {
      const { Attributes } = await sns.send(
        new GetSubscriptionAttributesCommand({ SubscriptionArn: subArn }),
      );
      return Attributes?.PendingConfirmation === "true" ? "pending" : "on";
    } catch (err) {
      console.warn("Falha ao verificar subscricao SNS:", err.message);
      return "on";
    }
  }

  return "off";
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
      return corsResponse(401, { error: "Credenciais invalidas" });
    }

    const isValid = verifyPassword(password, user.passwordHash.S);

    if (!isValid) {
      return corsResponse(401, { error: "Credenciais invalidas" });
    }

    const notificationStatus = await getNotificationStatus(user);

    return corsResponse(200, {
      userId: user.userId.S,
      username: user.username.S,
      email: user.email.S,
      notificationStatus,
    });
  } catch (err) {
    console.error(err);
    return corsResponse(500, { error: "Erro ao iniciar sessao" });
  }
};
