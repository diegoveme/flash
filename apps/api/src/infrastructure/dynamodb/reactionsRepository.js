import { GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { NotFoundError } from '../../lib/errors.js';
import { batchGet, failedConditions, notificationItem, withoutKeys } from './helpers.js';
import { keys } from './keys.js';
import { reactionCounterAttribute } from './postsRepository.js';

const POST_IS_VISIBLE = 'attribute_exists(pk) AND visible = :true';

/** @returns {import('../../application/ports.js').ReactionsRepository} */
export function createDynamoReactionsRepository({ client, table }) {
  return {
    async find(postId, userId) {
      const { Item } = await client.send(
        new GetCommand({
          TableName: table,
          Key: keys.reaction(postId, userId),
          ConsistentRead: true,
        }),
      );
      return withoutKeys(Item);
    },

    async findTypesForPosts(postIds, userId) {
      const items = await batchGet(
        client,
        table,
        postIds.map((postId) => keys.reaction(postId, userId)),
      );
      return new Map(items.map((item) => [item.postId, item.type]));
    },

    async create(reaction, { notification }) {
      // The reaction key (post + user) plus attribute_not_exists is what
      // guarantees a single reaction per user per post.
      const items = [
        {
          Put: {
            TableName: table,
            Item: {
              ...keys.reaction(reaction.postId, reaction.userId),
              entity: 'reaction',
              ...reaction,
            },
            ConditionExpression: 'attribute_not_exists(pk)',
          },
        },
        {
          Update: {
            TableName: table,
            Key: keys.post(reaction.postId),
            UpdateExpression: 'ADD #counter :one',
            ConditionExpression: POST_IS_VISIBLE,
            ExpressionAttributeNames: { '#counter': reactionCounterAttribute(reaction.type) },
            ExpressionAttributeValues: { ':one': 1, ':true': true },
          },
        },
      ];
      if (notification)
        items.push({ Put: { TableName: table, Item: notificationItem(notification) } });

      try {
        await client.send(new TransactWriteCommand({ TransactItems: items }));
        return true;
      } catch (error) {
        const failed = failedConditions(error);
        if (failed?.[1]) throw new NotFoundError('This post is not available.');
        if (failed?.[0]) return false;
        throw error;
      }
    },

    async changeType({ postId, userId, from, to, updatedAt }) {
      try {
        await client.send(
          new TransactWriteCommand({
            TransactItems: [
              {
                Update: {
                  TableName: table,
                  Key: keys.reaction(postId, userId),
                  UpdateExpression: 'SET #type = :to, updatedAt = :at',
                  ConditionExpression: '#type = :from',
                  ExpressionAttributeNames: { '#type': 'type' },
                  ExpressionAttributeValues: { ':to': to, ':from': from, ':at': updatedAt },
                },
              },
              {
                Update: {
                  TableName: table,
                  Key: keys.post(postId),
                  UpdateExpression: 'ADD #from :minus, #to :one',
                  ConditionExpression: POST_IS_VISIBLE,
                  ExpressionAttributeNames: {
                    '#from': reactionCounterAttribute(from),
                    '#to': reactionCounterAttribute(to),
                  },
                  ExpressionAttributeValues: { ':minus': -1, ':one': 1, ':true': true },
                },
              },
            ],
          }),
        );
        return true;
      } catch (error) {
        const failed = failedConditions(error);
        if (failed?.[1]) throw new NotFoundError('This post is not available.');
        if (failed?.[0]) return false;
        throw error;
      }
    },
  };
}
