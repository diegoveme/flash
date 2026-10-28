import { QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { NotFoundError } from '../../lib/errors.js';
import {
  failedConditions,
  fromCursor,
  notificationItem,
  toCursor,
  withoutKeys,
} from './helpers.js';
import { keys } from './keys.js';

/** @returns {import('../../application/ports.js').CommentsRepository} */
export function createDynamoCommentsRepository({ client, table }) {
  return {
    async add(comment, { notification }) {
      const items = [
        {
          Update: {
            TableName: table,
            Key: keys.post(comment.postId),
            UpdateExpression: 'ADD commentsCount :one',
            ConditionExpression: 'attribute_exists(pk) AND visible = :true',
            ExpressionAttributeValues: { ':one': 1, ':true': true },
          },
        },
        {
          Put: {
            TableName: table,
            Item: {
              ...keys.comment(comment.postId, comment.createdAt, comment.id),
              entity: 'comment',
              ...comment,
            },
            ConditionExpression: 'attribute_not_exists(pk)',
          },
        },
      ];
      if (notification)
        items.push({ Put: { TableName: table, Item: notificationItem(notification) } });

      try {
        await client.send(new TransactWriteCommand({ TransactItems: items }));
      } catch (error) {
        if (failedConditions(error)?.[0]) throw new NotFoundError('This post is not available.');
        throw error;
      }
    },

    async listByPost(postId, { cursor, limit }) {
      const partition = keys.post(postId).pk;
      const startKey = fromCursor(
        cursor,
        ['pk', 'sk'],
        (key) => key.pk === partition && key.sk.startsWith('COMMENT#'),
      );
      const result = await client.send(
        new QueryCommand({
          TableName: table,
          KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
          ExpressionAttributeValues: { ':pk': partition, ':prefix': 'COMMENT#' },
          ScanIndexForward: true,
          Limit: limit,
          ExclusiveStartKey: startKey,
        }),
      );
      return {
        items: (result.Items ?? []).map(withoutKeys),
        nextCursor: toCursor(result.LastEvaluatedKey),
      };
    },
  };
}
