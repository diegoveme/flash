import { createMemoryCommentsRepository } from './commentsRepository.js';
import { createMemoryNotificationsRepository } from './notificationsRepository.js';
import { createMemoryPostsRepository } from './postsRepository.js';
import { createMemoryReactionsRepository } from './reactionsRepository.js';
import { createMemorySessionsRepository } from './sessionsRepository.js';
import { createMemoryUsersRepository } from './usersRepository.js';

/** @param {ReturnType<typeof import('./memoryDatabase.js').createMemoryDatabase>} db */
export function createMemoryRepositories(db) {
  return {
    users: createMemoryUsersRepository(db),
    sessions: createMemorySessionsRepository(db),
    posts: createMemoryPostsRepository(db),
    comments: createMemoryCommentsRepository(db),
    reactions: createMemoryReactionsRepository(db),
    notifications: createMemoryNotificationsRepository(db),
  };
}
