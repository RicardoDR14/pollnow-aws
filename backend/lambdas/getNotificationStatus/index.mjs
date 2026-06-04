import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import {
  SNSClient,
  GetSubscriptionAttributesCommand,
} from "@aws-sdk/client-sns";

const dynamo = new DynamoDBClient({});
const sns = new SNSClient({ region: process.env.SNS_REGION || "us-east-1" });

function corsResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-user-id",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

// Determina o estado real da subscricao SNS, consultando o SNS quando possivel.
async function resolveStatus(user) {
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
      console.warn("Falha ao consultar subscricao SNS:", err.message);
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

    const userId =
      event.headers?.["x-user-id"] || event.headers?.["X-User-Id"];

    if (!userId) {
      return corsResponse(401, { error: "Utilizador nao autenticado" });
    }

    const { Item: user } = await dynamo.send(
      new GetItemCommand({
        TableName: process.env.USERS_TABLE,
        Key: { userId: { S: userId } },
      }),
    );

    if (!user) {
      return corsResponse(404, { error: "Utilizador nao encontrado" });
    }

    const notificationStatus = await resolveStatus(user);

    return corsResponse(200, { notificationStatus });
  } catch (err) {
    console.error(err);
    return corsResponse(500, {
      error: err.message || "Erro ao consultar estado de notificacoes",
    });
  }
};
