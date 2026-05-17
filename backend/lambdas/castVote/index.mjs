import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({});

export const handler = async (event) => {
  try {
    const { pollId } = event.pathParameters;
    const body = JSON.parse(event.body);

    const { Item } = await dynamo.send(
      new GetItemCommand({
        TableName: process.env.POLLS_TABLE,
        Key: { pollId: { S: pollId } },
      }),
    );

    if (!Item) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Sondagem não encontrada" }),
      };
    }

    if (Item.status.S !== "open") {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Sondagem já fechada" }),
      };
    }

    const now = new Date().toISOString();
    if (now > Item.closesAt.S) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Sondagem expirada" }),
      };
    }

    const voteId = crypto.randomUUID();
    await dynamo.send(
      new PutItemCommand({
        TableName: process.env.VOTES_TABLE,
        Item: {
          voteId: { S: voteId },
          pollId: { S: pollId },
          option: { S: body.option },
          votedAt: { S: now },
        },
      }),
    );

    return {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ success: true, voteId }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Erro ao registar voto" }),
    };
  }
};
