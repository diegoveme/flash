import { GetCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { registrationConflict } from '../../domain/users.js';
import { NotFoundError } from '../../lib/errors.js';
import { failedConditions, isConditionalCheckFailed, withoutKeys } from './helpers.js';
import { keys } from './keys.js';

/** @returns {import('../../application/ports.js').UsersRepository} */
export function createDynamoUsersRepository({ client, table }) {
  async function findById(id) {
    const { Item } = await client.send(new GetCommand({ TableName: table, Key: keys.user(id) }));
    return withoutKeys(Item);
  }

  async function findByLookup(key) {
    const { Item } = await client.send(new GetCommand({ TableName: table, Key: key }));
    return Item ? findById(Item.userId) : null;
  }

  return {
    async create(user) {
      const unique = 'attribute_not_exists(pk)';
      try {
        await client.send(
          new TransactWriteCommand({
            TransactItems: [
              {
                Put: {
                  TableName: table,
                  Item: { ...keys.user(user.id), entity: 'user', ...user },
                  ConditionExpression: unique,
                },
              },
              {
                Put: {
                  TableName: table,
                  Item: { ...keys.username(user.username), entity: 'username', userId: user.id },
                  ConditionExpression: unique,
                },
              },
              {
                Put: {
                  TableName: table,
                  Item: { ...keys.email(user.email), entity: 'email', userId: user.id },
                  ConditionExpression: unique,
                },
              },
            ],
          }),
        );
      } catch (error) {
        const failed = failedConditions(error);
        if (failed?.[1] || failed?.[2]) {
          throw registrationConflict({ username: failed[1], email: failed[2] });
        }
        throw error;
      }
    },

    findById,

    async findByUsername(username) {
      return findByLookup(keys.username(username));
    },

    async findByEmail(email) {
      return findByLookup(keys.email(email));
    },

    async updatePasswordHash(userId, passwordHash) {
      try {
        await client.send(
          new UpdateCommand({
            TableName: table,
            Key: keys.user(userId),
            UpdateExpression: 'SET passwordHash = :hash',
            ConditionExpression: 'attribute_exists(pk)',
            ExpressionAttributeValues: { ':hash': passwordHash },
          }),
        );
      } catch (error) {
        if (isConditionalCheckFailed(error)) throw new NotFoundError();
        throw error;
      }
    },
  };
}
