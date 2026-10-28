/** Single-table key design. See docs/data-model.md. */
export const keys = Object.freeze({
  user: (id) => ({ pk: `USER#${id}`, sk: 'PROFILE' }),
  username: (username) => ({ pk: `USERNAME#${username}`, sk: 'USERNAME' }),
  email: (email) => ({ pk: `EMAIL#${email}`, sk: 'EMAIL' }),
  session: (tokenHash) => ({ pk: `SESSION#${tokenHash}`, sk: 'SESSION' }),
  post: (id) => ({ pk: `POST#${id}`, sk: 'POST' }),
  comment: (postId, createdAt, id) => ({ pk: `POST#${postId}`, sk: `COMMENT#${createdAt}#${id}` }),
  reaction: (postId, userId) => ({ pk: `POST#${postId}`, sk: `REACTION#${userId}` }),
  notification: (recipientId, createdAt, id) => ({
    pk: `NOTIF#${recipientId}`,
    sk: `${createdAt}#${id}`,
  }),
});

export const INDEXES = Object.freeze({ FEED: 'GSI1', AUTHOR: 'GSI2' });
export const FEED_PARTITION = 'FEED';
export const authorPartition = (authorId) => `AUTHOR#${authorId}`;
export const notificationPartition = (recipientId) => `NOTIF#${recipientId}`;

/** DynamoDB TTL expects epoch seconds. */
export const toEpochSeconds = (iso) => Math.floor(new Date(iso).getTime() / 1000);
