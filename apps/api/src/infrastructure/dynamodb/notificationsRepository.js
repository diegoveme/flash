import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { retentionWindowStart } from '../../domain/notifications.js';
import { fromCursor, isConditionalCheckFailed, toCursor, withoutKeys } from './helpers.js';
import { notificationPartition } from './keys.js';

const UPDATE_CONCURRENCY = 10;

/** @returns {import('../../application/ports.js').NotificationsRepository} */
export function createDynamoNotificationsRepository({ client, table }) {
  /**
   * Only the last 7 days: the sort key starts with createdAt, so the key
   * condition skips older items, and the filter drops anything already past
   * `expiresAt`. DynamoDB TTL deletion is not exact, so this is required.
   */
  function activeQuery(recipientId, now, extra = {}) {
    return {
      TableName: table,
      KeyConditionExpression: 'pk = :pk AND sk >= :windowStart',
      FilterExpression: ['expiresAt > :now', extra.filter].filter(Boolean).join(' AND '),
      ExpressionAttributeNames: extra.names,
      ExpressionAttributeValues: {
        ':pk': notificationPartition(recipientId),
        ':windowStart': retentionWindowStart(now).toISOString(),
        ':now': now.toISOString(),
        ...extra.values,
      },
    };
  }

  async function* unreadKeys(recipientId, now) {
    let startKey;
    do {
      const result = await client.send(
        new QueryCommand({
          ...activeQuery(recipientId, now, {
            filter: '#read = :false',
            names: { '#read': 'read' },
            values: { ':false': false },
          }),
          ProjectionExpression: 'pk, sk',
          ExclusiveStartKey: startKey,
        }),
      );
      yield* result.Items ?? [];
      startKey = result.LastEvaluatedKey;
    } while (startKey);
  }

  return {
    async listActive(recipientId, { now, cursor, limit }) {
      const partition = notificationPartition(recipientId);
      const startKey = fromCursor(cursor, ['pk', 'sk'], (key) => key.pk === partition);
      const result = await client.send(
        new QueryCommand({
          ...activeQuery(recipientId, now),
          ScanIndexForward: false,
          Limit: limit,
          ExclusiveStartKey: startKey,
        }),
      );
      return {
        items: (result.Items ?? []).map(withoutKeys),
        nextCursor: toCursor(result.LastEvaluatedKey),
      };
    },

    async countUnread(recipientId, { now }) {
      let count = 0;
      let startKey;
      do {
        const result = await client.send(
          new QueryCommand({
            ...activeQuery(recipientId, now, {
              filter: '#read = :false',
              names: { '#read': 'read' },
              values: { ':false': false },
            }),
            Select: 'COUNT',
            ExclusiveStartKey: startKey,
          }),
        );
        count += result.Count ?? 0;
        startKey = result.LastEvaluatedKey;
      } while (startKey);
      return count;
    },

    async markAllRead(recipientId, { now }) {
      const markRead = (key) =>
        client
          .send(
            new UpdateCommand({
              TableName: table,
              Key: { pk: key.pk, sk: key.sk },
              UpdateExpression: 'SET #read = :true',
              ConditionExpression: 'attribute_exists(pk)',
              ExpressionAttributeNames: { '#read': 'read' },
              ExpressionAttributeValues: { ':true': true },
            }),
          )
          .catch((error) => {
            if (!isConditionalCheckFailed(error)) throw error;
          });

      let batch = [];
      for await (const key of unreadKeys(recipientId, now)) {
        batch.push(markRead(key));
        if (batch.length >= UPDATE_CONCURRENCY) {
          await Promise.all(batch);
          batch = [];
        }
      }
      await Promise.all(batch);
    },
  };
}
