import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

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

export const handler = async (event) => {
  try {
    if (event.requestContext?.http?.method === "OPTIONS") {
      return corsResponse(200, {});
    }

    const { pollId } = event.pathParameters || {};
    const body = JSON.parse(event.body || "{}");

    if (!pollId) {
      return corsResponse(400, {
        error: "PollId obrigatório",
      });
    }

    if (!body.option) {
      return corsResponse(400, {
        error: "Opção obrigatória",
      });
    }

    if (!body.voterId) {
      return corsResponse(400, {
        error: "VoterId obrigatório",
      });
    }

    const { Item } = await dynamo.send(
      new GetItemCommand({
        TableName: process.env.POLLS_TABLE,
        Key: { pollId: { S: pollId } },
      }),
    );

    if (!Item) {
      return corsResponse(404, {
        error: "Sondagem não encontrada",
      });
    }

    if (Item.status.S !== "open") {
      return corsResponse(400, {
        error: "Esta sondagem já está fechada",
      });
    }

    const now = new Date().toISOString();

    if (now > Item.closesAt.S) {
      return corsResponse(400, {
        error: "Esta sondagem já está fechada",
      });
    }

    const validOptions = Item.options.L.map((option) => option.S);

    if (!validOptions.includes(body.option)) {
      return corsResponse(400, {
        error: "Opção inválida",
      });
    }

    const existingVoteResult = await dynamo.send(
      new ScanCommand({
        TableName: process.env.VOTES_TABLE,
        FilterExpression: "pollId = :pollId AND voterId = :voterId",
        ExpressionAttributeValues: {
          ":pollId": { S: pollId },
          ":voterId": { S: body.voterId },
        },
      }),
    );

    const existingVote = (existingVoteResult.Items || [])[0];

    if (existingVote) {
      await dynamo.send(
        new UpdateItemCommand({
          TableName: process.env.VOTES_TABLE,
          Key: {
            voteId: { S: existingVote.voteId.S },
            pollId: { S: existingVote.pollId.S },
          },
          UpdateExpression: "SET #option = :option, updatedAt = :updatedAt",
          ExpressionAttributeNames: {
            "#option": "option",
          },
          ExpressionAttributeValues: {
            ":option": { S: body.option },
            ":updatedAt": { S: now },
          },
        }),
      );

      return corsResponse(200, {
        success: true,
        updated: true,
        voteId: existingVote.voteId.S,
      });
    }

    const voteId = crypto.randomUUID();

    await dynamo.send(
      new PutItemCommand({
        TableName: process.env.VOTES_TABLE,
        Item: {
          voteId: { S: voteId },
          pollId: { S: pollId },
          voterId: { S: body.voterId },
          option: { S: body.option },
          votedAt: { S: now },
        },
      }),
    );

    return corsResponse(201, {
      success: true,
      updated: false,
      voteId,
    });
  } catch (err) {
    console.error(err);

    return corsResponse(500, {
      error: "Erro ao registar voto",
    });
  }
};