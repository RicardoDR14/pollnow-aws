import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({});

export const handler = async () => {
  try {
    const { Items } = await dynamo.send(
      new ScanCommand({
        TableName: process.env.POLLS_TABLE,
      }),
    );

    const polls = (Items || []).map((item) => ({
      pollId: item.pollId.S,
      title: item.title.S,
      closesAt: item.closesAt.S,
      status: item.status.S,
      createdAt: item.createdAt.S,
      imageUrl: item.imageUrl?.S || "",
      options: item.options.L.map((o) => o.S),
    }));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify(polls),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Erro ao listar sondagens" }),
    };
  }
};
