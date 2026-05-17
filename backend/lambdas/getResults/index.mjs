import {
  DynamoDBClient,
  GetItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";

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

    // Scan com filtro por pollId — sem necessidade de GSI
    const { Items: votes } = await dynamo.send(
      new ScanCommand({
        TableName: process.env.VOTES_TABLE,
        FilterExpression: "pollId = :pollId",
        ExpressionAttributeValues: { ":pollId": { S: pollId } },
      }),
    );

    const options = Item.options.L.map((o) => o.S);
    const counts = {};
    options.forEach((o) => (counts[o] = 0));
    (votes || []).forEach((v) => {
      const opt = v.option.S;
      if (counts[opt] !== undefined) counts[opt]++;
    });

    const total = (votes || []).length;
    const results = options.map((o) => ({
      option: o,
      votes: counts[o],
      percentage: total > 0 ? Math.round((counts[o] / total) * 100) : 0,
    }));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({
        pollId,
        title: Item.title.S,
        status: Item.status.S,
        closesAt: Item.closesAt.S,
        total,
        results,
      }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Erro ao obter resultados" }),
    };
  }
};
