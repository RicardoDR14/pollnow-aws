import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({});

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