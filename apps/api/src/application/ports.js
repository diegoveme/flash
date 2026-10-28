/**
 * Ports: the contracts use cases depend on. Each one has an AWS adapter and
 * an in-memory/local adapter in `src/infrastructure`. Use cases never import
 * adapters directly; the composition root (`src/bootstrap/container.js`)
 * wires them.
 *
 * @typedef {{ items: any[], nextCursor: string | null }} Page
 *
 * @typedef {object} UsersRepository
 * @property {(user: object) => Promise<void>} create Throws ConflictError with `fields`.
 * @property {(id: string) => Promise<object | null>} findById
 * @property {(username: string) => Promise<object | null>} findByUsername
 * @property {(email: string) => Promise<object | null>} findByEmail
 * @property {(userId: string, passwordHash: string) => Promise<void>} updatePasswordHash
 *
 * @typedef {object} SessionsRepository
 * @property {(session: object) => Promise<void>} create
 * @property {(tokenHash: string) => Promise<object | null>} findByTokenHash Strongly consistent.
 * @property {(tokenHash: string, revokedAt: string) => Promise<void>} revoke
 *
 * @typedef {object} PostsRepository
 * @property {(post: object) => Promise<void>} create
 * @property {(id: string) => Promise<object | null>} findById Includes hidden posts.
 * @property {(ids: string[]) => Promise<Map<string, object>>} findManyByIds
 * @property {(options: { cursor?: string, limit: number }) => Promise<Page>} listFeed Visible only, newest first.
 * @property {(authorId: string, options: { cursor?: string, limit: number }) => Promise<Page>} listByAuthor
 * @property {(postId: string, authorId: string, hiddenAt: string) => Promise<void>} hide
 *
 * @typedef {object} CommentsRepository
 * @property {(comment: object, options: { notification: object | null }) => Promise<void>} add
 *   Atomically stores the comment, increments the post counter and stores the
 *   notification. Throws NotFoundError if the post is hidden.
 * @property {(postId: string, options: { cursor?: string, limit: number }) => Promise<Page>} listByPost Oldest first.
 *
 * @typedef {object} ReactionsRepository
 * @property {(postId: string, userId: string) => Promise<object | null>} find
 * @property {(postIds: string[], userId: string) => Promise<Map<string, string>>} findTypesForPosts
 * @property {(reaction: object, options: { notification: object | null }) => Promise<boolean>} create
 *   Returns false when the user already reacted (uniqueness enforced by the data store).
 * @property {(change: { postId: string, userId: string, from: string, to: string, updatedAt: string }) => Promise<boolean>} changeType
 *   Returns false when the stored type is no longer `from` (concurrent change).
 *
 * @typedef {object} NotificationsRepository
 * @property {(recipientId: string, options: { now: Date, cursor?: string, limit: number }) => Promise<Page>} listActive
 * @property {(recipientId: string, options: { now: Date }) => Promise<number>} countUnread
 * @property {(recipientId: string, options: { now: Date }) => Promise<void>} markAllRead
 *
 * @typedef {object} PasswordResetStore
 * @property {(tokenHash: string, userId: string, ttlSeconds: number) => Promise<void>} save
 *   Also invalidates the previous token of the same user.
 * @property {(tokenHash: string) => Promise<string | null>} consume Single use: returns the user id once.
 *
 * @typedef {object} ObjectStorage
 * @property {(target: { key: string, contentType: string, maxBytes: number, expiresInSeconds: number }) => Promise<{ url: string, fields: Record<string, string> }>} createUploadTarget
 * @property {(key: string, options: { maxBytes: number }) => Promise<{ body: Buffer, contentType?: string } | null>} getObject
 * @property {(key: string, body: Buffer, contentType: string) => Promise<void>} putObject
 * @property {(key: string) => Promise<void>} deleteObject
 * @property {(key: string) => string} publicUrl
 *
 * @typedef {object} Mailer
 * @property {(message: { to: string, subject: string, text: string, html: string }) => Promise<void>} send
 *
 * @typedef {object} PasswordHasher
 * @property {(password: string) => Promise<string>} hash
 * @property {(password: string, hash: string | undefined) => Promise<boolean>} verify
 *   Must take similar time when `hash` is missing, to avoid user enumeration.
 */

export {};
