import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const dynamo = new DynamoDBClient({});
const sns = new SNSClient({ region: process.env.SNS_REGION || "us-east-1" });
const s3 = new S3Client({});

export const handler = async () => {
  try {
    const now = new Date().toISOString();

    const { Items } = await dynamo.send(
      new ScanCommand({
        TableName: process.env.POLLS_TABLE,
        FilterExpression: "#s = :open AND closesAt < :now",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: {
          ":open": { S: "open" },
          ":now": { S: now },
        },
      }),
    );

    for (const poll of Items || []) {
      const pollId = poll.pollId.S;
      const title = poll.title.S;
      const ownerId = poll.ownerId?.S || "";
      const options = poll.options.L.map((o) => o.S);

      // Buscar votos desta sondagem
      const { Items: votes } = await dynamo.send(
        new ScanCommand({
          TableName: process.env.VOTES_TABLE,
          FilterExpression: "pollId = :pollId",
          ExpressionAttributeValues: { ":pollId": { S: pollId } },
        }),
      );

      // Agregar votos
      const counts = {};
      options.forEach((o) => (counts[o] = 0));
      (votes || []).forEach((v) => {
        const opt = v.option.S;
        if (counts[opt] !== undefined) counts[opt]++;
      });

      const total = (votes || []).length;
      const resultLines = options
        .map(
          (o) =>
            `${o}: ${counts[o]} votos (${total > 0 ? Math.round((counts[o] / total) * 100) : 0}%)`,
        )
        .join("\n");

      // Gerar CSV e guardar no S3
      const csvLines = [
        "Opcao,Votos,Percentagem",
        ...options.map(
          (o) =>
            `${o},${counts[o]},${total > 0 ? Math.round((counts[o] / total) * 100) : 0}%`,
        ),
      ];
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: `results/${pollId}.csv`,
          Body: csvLines.join("\n"),
          ContentType: "text/csv",
        }),
      );

      // Publicar resultados via SNS com MessageAttribute ownerId para que o
      // SNS encaminhe apenas para o subscriber cujo FilterPolicy corresponde.
      if (process.env.SNS_TOPIC_ARN) {
        if (ownerId) {
          console.log(
            `SNS publish: sondagem ${pollId} | ownerId=${ownerId}`,
          );
          await sns.send(
            new PublishCommand({
              TopicArn: process.env.SNS_TOPIC_ARN,
              Subject: `Sondagem "${title}" fechou!`,
              Message:
                `A tua sondagem "${title}" fechou!\n\n` +
                `Resultados:\n${resultLines}\n\n` +
                `Total: ${total} participantes.`,
              MessageAttributes: {
                ownerId: {
                  DataType: "String",
                  StringValue: ownerId,
                },
              },
            }),
          );
        } else {
          console.warn(
            `Sondagem ${pollId} sem ownerId -- SNS nao publicado.`,
          );
        }
      }

      // Marcar como notificada independentemente do envio SNS
      await dynamo.send(
        new UpdateItemCommand({
          TableName: process.env.POLLS_TABLE,
          Key: { pollId: { S: pollId } },
          UpdateExpression: "SET #s = :notified",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":notified": { S: "notified" } },
        }),
      );

      console.log(`Sondagem ${pollId} encerrada e marcada como notified.`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ processed: (Items || []).length }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
