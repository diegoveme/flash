import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';
import {
  batchGet,
  fromCursor,
  isConditionalCheckFailed,
  toCursor,
  withoutKeys,
} from './helpers.js';
import { FEED_PARTITION, INDEXES, authorPartition, keys } from './keys.js';

/** Reaction counters are top-level numbers so they can be updated with ADD. */
export function reactionCounterAttribute(type) {
  return `${type}Count`;
}

function toItem(post) {
  const { reactionsCount, ...rest } = post;
  const sortKey = `${post.createdAt}#${post.id}`;
  return {
    ...keys.post(post.id),
    entity: 'post',
    ...rest,
    likeCount: reactionsCount.like,
    inspireCount: reactionsCount.inspire,
    wowCount: reactionsCount.wow,
    gsi1pk: FEED_PARTITION,
    gsi1sk: sortKey,
    gsi2pk: authorPartition(post.authorId),
    gsi2sk: sortKey,
  };
}

function fromItem(item) {
  if (!item) return null;
  const { likeCount, inspireCount, wowCount, ...rest } = withoutKeys(item);
  return {
    ...rest,
    reactionsCount: { like: likeCount ?? 0, inspire: inspireCount ?? 0, wow: wowCount ?? 0 },
    commentsCount: rest.commentsCount ?? 0,
  };
}

/** @returns {import('../../application/ports.js').PostsRepository} */
export function createDynamoPostsRepository({ client, table }) {
  async function queryIndex({
    index,
    partitionAttribute,
    partition,
    sortAttribute,
    cursor,
    limit,
  }) {
    const startKey = fromCursor(
      cursor,
      ['pk', 'sk', partitionAttribute, sortAttribute],
      (key) =>
        key[partitionAttribute] === partition && key.pk.startsWith('POST#') && key.sk === 'POST',
    );
    const result = await client.send(
      new QueryCommand({
        TableName: table,
        IndexName: index,
        KeyConditionExpression: '#partition = :partition',
        ExpressionAttributeNames: { '#partition': partitionAttribute },
        ExpressionAttributeValues: { ':partition': partition },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: startKey,
      }),
    );
    return {
      items: (result.Items ?? []).map(fromItem),
      nextCursor: toCursor(result.LastEvaluatedKey),
    };
  }

  return {
    async create(post) {
      await client.send(
        new PutCommand({
          TableName: table,
          Item: toItem(post),
          ConditionExpression: 'attribute_not_exists(pk)',
        }),
      );
    },

    async findById(id) {
      const { Item } = await client.send(new GetCommand({ TableName: table, Key: keys.post(id) }));
      return fromItem(Item);
    },

    async findManyByIds(ids) {
      const items = await batchGet(client, table, ids.map(keys.post));
      return new Map(items.map(fromItem).map((post) => [post.id, post]));
    },

    listFeed({ cursor, limit }) {
      return queryIndex({
        index: INDEXES.FEED,
        partitionAttribute: 'gsi1pk',
        partition: FEED_PARTITION,
        sortAttribute: 'gsi1sk',
        cursor,
        limit,
      });
    },

    listByAuthor(authorId, { cursor, limit }) {
      return queryIndex({
        index: INDEXES.AUTHOR,
        partitionAttribute: 'gsi2pk',
        partition: authorPartition(authorId),
        sortAttribute: 'gsi2sk',
        cursor,
        limit,
      });
    },

    async hide(postId, authorId, hiddenAt) {
      try {
        // Removing the index keys takes the post out of the feed and the profile.
        await client.send(
          new UpdateCommand({
            TableName: table,
            Key: keys.post(postId),
            UpdateExpression:
              'SET visible = :false, hiddenAt = :at REMOVE gsi1pk, gsi1sk, gsi2pk, gsi2sk',
            ConditionExpression: 'attribute_exists(pk) AND visible = :true AND authorId = :author',
            ExpressionAttributeValues: {
              ':false': false,
              ':true': true,
              ':at': hiddenAt,
              ':author': authorId,
            },
          }),
        );
      } catch (error) {
        if (!isConditionalCheckFailed(error)) throw error;
        const current = await this.findById(postId);
        if (current?.visible && current.authorId !== authorId) throw new ForbiddenError();
        throw new NotFoundError();
      }
    },
  };
}
