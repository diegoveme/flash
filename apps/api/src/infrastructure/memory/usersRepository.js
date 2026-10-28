import { registrationConflict } from '../../domain/users.js';
import { NotFoundError } from '../../lib/errors.js';
import { clone } from './memoryDatabase.js';

/** @returns {import('../../application/ports.js').UsersRepository} */
export function createMemoryUsersRepository(db) {
  const { state } = db;

  return {
    async create(user) {
      const taken = {
        username: user.username in state.usernames,
        email: user.email in state.emails,
      };
      if (taken.username || taken.email) throw registrationConflict(taken);

      state.users[user.id] = clone(user);
      state.usernames[user.username] = user.id;
      state.emails[user.email] = user.id;
      db.persist();
    },

    async findById(id) {
      return clone(state.users[id]);
    },

    async findByUsername(username) {
      const id = state.usernames[username];
      return id ? clone(state.users[id]) : null;
    },

    async findByEmail(email) {
      const id = state.emails[email];
      return id ? clone(state.users[id]) : null;
    },

    async updatePasswordHash(userId, passwordHash) {
      const user = state.users[userId];
      if (!user) throw new NotFoundError();
      user.passwordHash = passwordHash;
      db.persist();
    },
  };
}
