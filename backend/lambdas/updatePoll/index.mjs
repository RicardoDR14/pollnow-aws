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
      "Access-Control-Allow-Methods": "PUT, OPTIONS",
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
    const body = JSON.parse(event.body || "{}");

    const ownerId =
      event.headers?.["x-user-id"] ||
      event.headers?.["X-User-Id"] ||
      body.ownerId;

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
        error: "Não tens permissão para editar esta sondagem",
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

    if (!body.closesAt) {
      return corsResponse(400, {
        error: "Data de fecho obrigatória",
      });
    }

    const closesAt = new Date(body.closesAt);
    if (Number.isNaN(closesAt.getTime())) {
      return corsResponse(400, {
        error: "Data de fecho inválida",
      });
    }

    const updatedAt = new Date().toISOString();

    await dynamo.send(
      new UpdateItemCommand({
        TableName: process.env.POLLS_TABLE,
        Key: {
          pollId: { S: pollId },
        },
        UpdateExpression:
          "SET #title = :title, #description = :description, #options = :options, closesAt = :closesAt, authorPhone = :authorPhone, ownerEmail = :ownerEmail, updatedAt = :updatedAt",
        ExpressionAttributeNames: {
          "#title": "title",
          "#description": "description",
          "#options": "options",
        },
        ExpressionAttributeValues: {
          ":title": { S: body.title.trim() },
          ":description": { S: body.description?.trim() || "" },
          ":options": {
            L: cleanOptions.map((option) => ({ S: option })),
          },
          ":closesAt": { S: closesAt.toISOString() },
          ":authorPhone": { S: body.authorPhone || body.ownerEmail || "" },
          ":ownerEmail": { S: body.ownerEmail || body.authorPhone || "" },
          ":updatedAt": { S: updatedAt },
        },
      }),
    );

    return corsResponse(200, {
      success: true,
      pollId,
      updatedAt,
    });
  } catch (err) {
    console.error(err);

    return corsResponse(500, {
      error: "Erro ao editar sondagem",
    });
  }
};