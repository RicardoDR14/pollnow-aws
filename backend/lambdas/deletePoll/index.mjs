import {
  DynamoDBClient,
  GetItemCommand,
  DeleteItemCommand,
  ScanCommand,
  BatchWriteItemCommand,
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
      "Access-Control-Allow-Methods": "DELETE, OPTIONS",
    },
    body: JSON.stringify(body),
  };
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

async function deleteVotesForPoll(pollId) {
  if (!process.env.VOTES_TABLE) return 0;

  const { Items } = await dynamo.send(
    new ScanCommand({
      TableName: process.env.VOTES_TABLE,
      FilterExpression: "pollId = :pollId",
      ExpressionAttributeValues: {
        ":pollId": { S: pollId },
      },
    }),
  );

  const votes = Items || [];

  for (let i = 0; i < votes.length; i += 25) {
    const batch = votes.slice(i, i + 25);

    await dynamo.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [process.env.VOTES_TABLE]: batch.map((vote) => ({
            DeleteRequest: {
              Key: {
                voteId: { S: vote.voteId.S },
                pollId: { S: vote.pollId.S },
              },
            },
          })),
        },
      }),
    );
  }

  return votes.length;
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
        error: "Não tens permissão para eliminar esta sondagem",
      });
    }

    const deletedAt = new Date().toISOString();
    const deletedVotes = await deleteVotesForPoll(pollId);

    await publishNotification({
      subject: `PollNow — Sondagem eliminada`,
      message:
        `Uma sondagem foi eliminada no PollNow.\n\n` +
        `Título: ${Item.title?.S || "N/A"}\n` +
        `Autor: ${Item.ownerUsername?.S || "N/A"}\n` +
        `Email do autor: ${Item.ownerEmail?.S || Item.authorPhone?.S || "N/A"}\n` +
        `Eliminada em: ${deletedAt}\n` +
        `Votos eliminados: ${deletedVotes}\n\n` +
        `ID da sondagem: ${pollId}`,
    });

    await dynamo.send(
      new DeleteItemCommand({
        TableName: process.env.POLLS_TABLE,
        Key: {
          pollId: { S: pollId },
        },
      }),
    );

    return corsResponse(200, {
      success: true,
      pollId,
      deletedVotes,
    });
  } catch (err) {
    console.error(err);

    return corsResponse(500, {
      error: "Erro ao eliminar sondagem",
    });
  }
};