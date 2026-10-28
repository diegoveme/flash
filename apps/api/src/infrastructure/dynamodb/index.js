import { createDocumentClient } from './client.js';
import { createDynamoCommentsRepository } from './commentsRepository.js';
import { createDynamoNotificationsRepository } from './notificationsRepository.js';
import { createDynamoPostsRepository } from './postsRepository.js';
import { createDynamoReactionsRepository } from './reactionsRepository.js';
import { createDynamoSessionsRepository } from './sessionsRepository.js';
import { createDynamoUsersRepository } from './usersRepository.js';

/**
 * @param {{ region: string, endpoint?: string, table: string }} options
 */
export function createDynamoRepositories({ region, endpoint, table }) {
  const deps = { client: createDocumentClient({ region, endpoint }), table };
  return {
    users: createDynamoUsersRepository(deps),
    sessions: createDynamoSessionsRepository(deps),
    posts: createDynamoPostsRepository(deps),
    comments: createDynamoCommentsRepository(deps),
    reactions: createDynamoReactionsRepository(deps),
    notifications: createDynamoNotificationsRepository(deps),
  };
}
