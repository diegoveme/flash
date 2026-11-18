import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * @param {{ region: string, endpoint?: string }} options `endpoint` targets DynamoDB Local.
 * @returns {{ client: DynamoDBDocumentClient, close: () => Promise<void> }}
 */
export function createDocumentClient({ region, endpoint }) {
  const base = new DynamoDBClient({ region, ...(endpoint ? { endpoint } : {}) });
  const client = DynamoDBDocumentClient.from(base, {
    marshallOptions: { removeUndefinedValues: true },
  });
  // The document client does not own the base client's sockets.
  const close = async () => {
    client.destroy();
    base.destroy();
  };
  return { client, close };
}
