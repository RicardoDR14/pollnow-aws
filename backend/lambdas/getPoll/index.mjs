import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({});

export const handler = async (event) => {
  try {
    const { pollId } = event.pathParameters;

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

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({
        pollId: Item.pollId.S,
        title: Item.title.S,
        options: Item.options.L.map((o) => o.S),
        closesAt: Item.closesAt.S,
        status: Item.status.S,
        imageUrl: Item.imageUrl?.S || "",
        createdAt: Item.createdAt.S,
      }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Erro ao obter sondagem" }),
    };
  }
};
