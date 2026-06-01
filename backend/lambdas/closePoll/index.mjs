import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const dynamo = new DynamoDBClient({});
const sns = new SNSClient({ region: process.env.SNS_REGION || "us-east-1" });

function corsResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-user-id",
      "Access-Control-Allow-Methods": "PATCH, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function getResultsUrl(pollId) {
  const frontendUrl = process.env.FRONTEND_URL || "";
  return frontendUrl ? `${frontendUrl}/results/${pollId}` : `/results/${pollId}`;
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

export const handler = async (event) => {
  try {
    if (event.requestContext?.http?.method === "OPTIONS") {
      return corsResponse(200, {});
    }

    const { pollId } = event.pathParameters || {};
    const ownerId =
      event.headers?.["x-user-id"] || event.headers?.["X-User-Id"];

    if (!pollId) {
      return corsResponse(400, {
        error: "PollId obrigatório",
      });
    }

    if (!ownerId) {
      return corsResponse(401, {
        error: "Utilizador não autenticado",
      });
    }

    const { Item } = await dynamo.send(
      new GetItemCommand({
        TableName: process.env.POLLS_TABLE,
        Key: {
          pollId: { S: pollId },
        },
      }),
    );

    if (!Item) {
      return corsResponse(404, {
        error: "Sondagem não encontrada",
      });
    }

    if (Item.ownerId?.S !== ownerId) {
      return corsResponse(403, {
        error: "Não tens permissão para fechar esta sondagem",
      });
    }

    const closedAt = new Date().toISOString();

    await dynamo.send(
      new UpdateItemCommand({
        TableName: process.env.POLLS_TABLE,
        Key: {
          pollId: { S: pollId },
        },
        UpdateExpression: "SET #status = :status, closedAt = :closedAt",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": { S: "closed" },
          ":closedAt": { S: closedAt },
        },
      }),
    );

    await publishNotification({
      subject: `PollNow — Sondagem fechada manualmente`,
      message:
        `Uma sondagem foi fechada manualmente no PollNow.\n\n` +
        `Título: ${Item.title?.S || "N/A"}\n` +
        `Autor: ${Item.ownerUsername?.S || "N/A"}\n` +
        `Email do autor: ${Item.ownerEmail?.S || Item.authorPhone?.S || "N/A"}\n` +
        `Fechada em: ${closedAt}\n\n` +
        `Link para resultados:\n${getResultsUrl(pollId)}\n\n` +
        `ID da sondagem: ${pollId}`,
    });

    return corsResponse(200, {
      success: true,
      pollId,
      status: "closed",
      closedAt,
    });
  } catch (err) {
    console.error(err);

    return corsResponse(500, {
      error: "Erro ao fechar sondagem",
    });
  }
};