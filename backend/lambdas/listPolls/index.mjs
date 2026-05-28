import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({});

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

export const handler = async (event) => {
  try {
    if (event.requestContext?.http?.method === "OPTIONS") {
      return corsResponse(200, {});
    }

    const ownerId =
      event.headers?.["x-user-id"] ||
      event.headers?.["X-User-Id"] ||
      event.queryStringParameters?.ownerId;

    if (!ownerId) {
      return corsResponse(401, {
        error: "Utilizador não autenticado",
      });
    }

    const { Items } = await dynamo.send(
      new ScanCommand({
        TableName: process.env.POLLS_TABLE,
        FilterExpression: "ownerId = :ownerId",
        ExpressionAttributeValues: {
          ":ownerId": { S: ownerId },
        },
      }),
    );

    const polls = (Items || []).map((item) => ({
      pollId: item.pollId.S,
      ownerId: item.ownerId?.S || "",
      ownerUsername: item.ownerUsername?.S || "",
      ownerEmail: item.ownerEmail?.S || "",
      title: item.title.S,
      description: item.description?.S || "",
      closesAt: item.closesAt.S,
      status: item.status.S,
      createdAt: item.createdAt.S,
      imageUrl: item.imageUrl?.S || "",
      options: item.options.L.map((option) => option.S),
    }));

    return corsResponse(200, polls);
  } catch (err) {
    console.error(err);

    return corsResponse(500, {
      error: "Erro ao listar sondagens",
    });
  }
};
