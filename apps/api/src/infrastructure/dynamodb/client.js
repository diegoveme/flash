import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * @param {{ region: string, endpoint?: string }} options `endpoint` targets DynamoDB Local.
 */
export function createDocumentClient({ region, endpoint }) {
  const client = new DynamoDBClient({ region, ...(endpoint ? { endpoint } : {}) });
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
}
