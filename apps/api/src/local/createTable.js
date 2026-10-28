import { pathToFileURL } from 'node:url';
import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  UpdateTimeToLiveCommand,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';
import { loadConfig } from '../config/env.js';

/**
 * Creates the single table in DynamoDB Local with the same keys, indexes and
 * TTL as infra/template.yaml. Safe to run many times.
 * @param {ReturnType<typeof loadConfig>} config
 */
export async function ensureTable(config) {
  const client = new DynamoDBClient({
    region: config.aws.region,
    endpoint: config.dynamodb.endpoint,
  });
  const TableName = config.dynamodb.table;

  try {
    await client.send(new DescribeTableCommand({ TableName }));
    return { created: false };
  } catch (error) {
    if (error?.name !== 'ResourceNotFoundException') throw error;
  }

  const index = (name, partition, sort) => ({
    IndexName: name,
    KeySchema: [
      { AttributeName: partition, KeyType: 'HASH' },
      { AttributeName: sort, KeyType: 'RANGE' },
    ],
    Projection: { ProjectionType: 'ALL' },
  });

  await client.send(
    new CreateTableCommand({
      TableName,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: ['pk', 'sk', 'gsi1pk', 'gsi1sk', 'gsi2pk', 'gsi2sk'].map(
        (AttributeName) => ({
          AttributeName,
          AttributeType: 'S',
        }),
      ),
      KeySchema: [
        { AttributeName: 'pk', KeyType: 'HASH' },
        { AttributeName: 'sk', KeyType: 'RANGE' },
      ],
      GlobalSecondaryIndexes: [
        index('GSI1', 'gsi1pk', 'gsi1sk'),
        index('GSI2', 'gsi2pk', 'gsi2sk'),
      ],
    }),
  );
  await waitUntilTableExists({ client, maxWaitTime: 30 }, { TableName });
  await client.send(
    new UpdateTimeToLiveCommand({
      TableName,
      TimeToLiveSpecification: { Enabled: true, AttributeName: 'ttl' },
    }),
  );
  return { created: true };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const config = loadConfig();
  const { created } = await ensureTable(config);
  console.log(
    created
      ? `Table ${config.dynamodb.table} created.`
      : `Table ${config.dynamodb.table} already exists.`,
  );
}
