import {
  DynamoDBClient,
  GetItemCommand,
  DeleteItemCommand,
  ScanCommand,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({});

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

    const deletedVotes = await deleteVotesForPoll(pollId);

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