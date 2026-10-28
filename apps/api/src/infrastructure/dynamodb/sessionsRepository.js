import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { isConditionalCheckFailed, withoutKeys } from './helpers.js';
import { keys, toEpochSeconds } from './keys.js';

/** @returns {import('../../application/ports.js').SessionsRepository} */
export function createDynamoSessionsRepository({ client, table }) {
  return {
    async create(session) {
      await client.send(
        new PutCommand({
          TableName: table,
          Item: {
            ...keys.session(session.tokenHash),
            entity: 'session',
            ...session,
            ttl: toEpochSeconds(session.expiresAt),
          },
          ConditionExpression: 'attribute_not_exists(pk)',
        }),
      );
    },

    async findByTokenHash(tokenHash) {
      // Strongly consistent read: a logout must be visible on the very next request.
      const { Item } = await client.send(
        new GetCommand({ TableName: table, Key: keys.session(tokenHash), ConsistentRead: true }),
      );
      return withoutKeys(Item);
    },

    async revoke(tokenHash, revokedAt) {
      try {
        await client.send(
          new UpdateCommand({
            TableName: table,
            Key: keys.session(tokenHash),
            UpdateExpression: 'SET revoked = :true, revokedAt = :at',
            ConditionExpression: 'attribute_exists(pk)',
            ExpressionAttributeValues: { ':true': true, ':at': revokedAt },
          }),
        );
      } catch (error) {
        if (!isConditionalCheckFailed(error)) throw error;
      }
    },
  };
}
