import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import {
  SNSClient,
  SubscribeCommand,
  UnsubscribeCommand,
} from "@aws-sdk/client-sns";

const dynamo = new DynamoDBClient({});
const sns = new SNSClient({ region: process.env.SNS_REGION || "us-east-1" });

function corsResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-user-id",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function existingArnStatus(arn) {
  if (!arn) return null;
  if (arn === "pending confirmation") return "pending";
  if (arn.startsWith("arn:aws:sns")) return "on";
  return null;
}

async function subscribeUser(userId, email) {
  try {
    const { SubscriptionArn } = await sns.send(
      new SubscribeCommand({
        TopicArn: process.env.SNS_TOPIC_ARN,
        Protocol: "email",
        Endpoint: email,
        Attributes: {
          // SNS entrega apenas quando ownerId == userId do dono
          FilterPolicy: JSON.stringify({ ownerId: [userId] }),
        },
      }),
    );
    return { SubscriptionArn };
  } catch (err) {
    if (err.message?.includes("already exists")) {
      return { conflict: true };
    }
    throw err;
  }
}

async function unsubscribeIfConfirmed(subArn) {
  if (!subArn?.startsWith("arn:aws:sns")) return;
  try {
    await sns.send(new UnsubscribeCommand({ SubscriptionArn: subArn }));
    console.log(`Subscricao SNS cancelada: ${subArn}`);
  } catch (err) {
    console.warn("Falha ao cancelar subscricao SNS:", err.message);
  }
}

async function saveArn(userId, arn) {
  await dynamo.send(
    new UpdateItemCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId: { S: userId } },
      UpdateExpression:
        "SET notificationSubArn = :arn, notificationsEnabled = :enabled",
      ExpressionAttributeValues: {
        ":arn": { S: arn },
        ":enabled": { BOOL: true },
      },
    }),
  );
}

async function clearArn(userId) {
  await dynamo.send(
    new UpdateItemCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId: { S: userId } },
      UpdateExpression:
        "SET notificationsEnabled = :disabled REMOVE notificationSubArn",
      ExpressionAttributeValues: {
        ":disabled": { BOOL: false },
      },
    }),
  );
}

async function enableNotifications(userId, user) {
  const existingStatus = existingArnStatus(user.notificationSubArn?.S);
  if (existingStatus) {
    return corsResponse(200, { status: existingStatus, email: user.email.S });
  }

  const email = user.email.S;
  const result = await subscribeUser(userId, email);

  if (result.conflict) {
    return corsResponse(409, {
      error:
        "O teu email ja esta subscrito a este topico com configuracao diferente. " +
        "Apaga a subscricao existente em SNS → Subscriptions e tenta de novo.",
    });
  }

  await saveArn(userId, result.SubscriptionArn);
  console.log(
    `Subscricao SNS criada para ${email} -- SubscriptionArn: ${result.SubscriptionArn}`,
  );
  return corsResponse(200, { status: "pending", email });
}

async function disableNotifications(userId, user) {
  await unsubscribeIfConfirmed(user.notificationSubArn?.S);
  await clearArn(userId);
  return corsResponse(200, { status: "off" });
}

export const handler = async (event) => {
  try {
    if (event.requestContext?.http?.method === "OPTIONS") {
      return corsResponse(200, {});
    }

    const userId =
      event.headers?.["x-user-id"] || event.headers?.["X-User-Id"];

    if (!userId) {
      return corsResponse(401, { error: "Utilizador nao autenticado" });
    }

    const body = JSON.parse(event.body || "{}");

    if (typeof body.enabled !== "boolean") {
      return corsResponse(400, {
        error: "Campo 'enabled' obrigatorio (true ou false)",
      });
    }

    const { Item: user } = await dynamo.send(
      new GetItemCommand({
        TableName: process.env.USERS_TABLE,
        Key: { userId: { S: userId } },
      }),
    );

    if (!user) {
      return corsResponse(404, { error: "Utilizador nao encontrado" });
    }

    return body.enabled
      ? enableNotifications(userId, user)
      : disableNotifications(userId, user);
  } catch (err) {
    console.error(err);
    return corsResponse(500, {
      error: err.message || "Erro ao atualizar notificacoes",
    });
  }
};
