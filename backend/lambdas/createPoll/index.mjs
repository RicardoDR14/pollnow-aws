import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const dynamo = new DynamoDBClient({});
const s3 = new S3Client({});

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const pollId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    let imageUrl = "";

    if (body.image) {
      const buffer = Buffer.from(body.image, "base64");
      const key = `banners/${pollId}.jpg`;
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: "image/jpeg",
        }),
      );
      imageUrl = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
    }

    await dynamo.send(
      new PutItemCommand({
        TableName: process.env.POLLS_TABLE,
        Item: {
          pollId: { S: pollId },
          title: { S: body.title },
          options: { L: body.options.map((o) => ({ S: o })) },
          closesAt: { S: body.closesAt },
          authorPhone: { S: body.authorPhone },
          imageUrl: { S: imageUrl },
          status: { S: "open" },
          createdAt: { S: createdAt },
        },
      }),
    );

    return {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ pollId, shareUrl: `/vote/${pollId}` }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Erro ao criar sondagem" }),
    };
  }
};
