/** Pagination sizes. The feed size is a product requirement; the others are defaults. */
export const FEED_PAGE_SIZE = 12;
export const COMMENTS_PAGE_SIZE = 50;
export const NOTIFICATIONS_PAGE_SIZE = 20;

/** Content limits. */
export const COMMENT_MAX_LENGTH = 500;
export const DESCRIPTION_MAX_LENGTH = 1000;
export const TAGS_MAX_COUNT = 10;
export const TAG_MAX_LENGTH = 30;

/** Image upload rules: JPEG or PNG only, 10 MB max. */
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_CONTENT_TYPES = Object.freeze(['image/jpeg', 'image/png']);

/** Account rules. bcrypt only uses the first 72 bytes of a password. */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_PATTERN = /^[a-z0-9_.]+$/;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

/** Lifetimes. */
export const SESSION_TTL_HOURS = 24;
export const PASSWORD_RESET_TTL_MINUTES = 60;
export const NOTIFICATION_TTL_DAYS = 7;
