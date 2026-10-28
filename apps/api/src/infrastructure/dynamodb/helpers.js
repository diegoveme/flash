import { BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { decodeCursor, encodeCursor } from '../../lib/cursor.js';
import { ValidationError } from '../../lib/errors.js';
import { keys, toEpochSeconds } from './keys.js';

export function isConditionalCheckFailed(error) {
  return error?.name === 'ConditionalCheckFailedException';
}

/**
 * For a cancelled transaction, tells which items failed their condition.
 * @returns {boolean[] | null} null when the error is not a cancelled transaction
 */
export function failedConditions(error) {
  if (error?.name !== 'TransactionCanceledException') return null;
  return (error.CancellationReasons ?? []).map(
    (reason) => reason?.Code === 'ConditionalCheckFailed',
  );
}

/**
 * Encodes a LastEvaluatedKey as an opaque cursor.
 * @param {Record<string, string> | undefined} lastKey
 */
export function toCursor(lastKey) {
  return lastKey ? encodeCursor(lastKey) : null;
}

/**
 * Decodes a cursor back into an ExclusiveStartKey and checks it belongs to
 * the expected partition, so a forged cursor can not read other data.
 * @param {string | undefined} cursor
 * @param {string[]} shape attribute names the key must have
 * @param {(key: Record<string, string>) => boolean} belongs
 */
export function fromCursor(cursor, shape, belongs) {
  const key = decodeCursor(cursor, shape);
  if (key && !belongs(key)) {
    throw new ValidationError('Invalid cursor.', { cursor: 'Invalid cursor.' });
  }
  return key;
}

/**
 * BatchGetItem in chunks of 100, retrying unprocessed keys.
 * @param {import('@aws-sdk/lib-dynamodb').DynamoDBDocumentClient} client
 * @param {string} table
 * @param {Record<string, string>[]} itemKeys
 */
export async function batchGet(client, table, itemKeys) {
  const items = [];
  for (let start = 0; start < itemKeys.length; start += 100) {
    let request = { [table]: { Keys: itemKeys.slice(start, start + 100) } };
    for (let attempt = 0; attempt < 5 && request && Object.keys(request).length > 0; attempt++) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** attempt));
      const result = await client.send(new BatchGetCommand({ RequestItems: request }));
      items.push(...(result.Responses?.[table] ?? []));
      request = result.UnprocessedKeys;
    }
  }
  return items;
}

/** Notification item, written inside comment and reaction transactions. */
export function notificationItem(notification) {
  return {
    ...keys.notification(notification.recipientId, notification.createdAt, notification.id),
    entity: 'notification',
    ...notification,
    ttl: toEpochSeconds(notification.expiresAt),
  };
}

/** Strips storage attributes so only domain fields leave the adapter. */
export function withoutKeys(item) {
  if (!item) return null;
  // eslint-disable-next-line no-unused-vars
  const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, entity, ttl, ...rest } = item;
  return rest;
}
