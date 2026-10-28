import path from 'node:path';

const DRIVERS = Object.freeze({
  DB_DRIVER: ['memory', 'dynamodb'],
  CACHE_DRIVER: ['memory', 'redis'],
  STORAGE_DRIVER: ['local', 's3'],
  MAIL_DRIVER: ['outbox', 'ses'],
});

function driver(env, name) {
  const allowed = DRIVERS[name];
  const value = env[name] || allowed[0];
  if (!allowed.includes(value)) {
    throw new Error(`${name} must be one of: ${allowed.join(', ')}`);
  }
  return value;
}

function integer(env, name, fallback) {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value)) throw new Error(`${name} must be an integer`);
  return value;
}

function required(env, name, when) {
  const value = env[name];
  if (when && !value) throw new Error(`${name} is required`);
  return value || undefined;
}

/**
 * Reads and validates configuration once. Defaults target local development:
 * in-memory data, local disk storage and a file outbox instead of SES.
 * @param {NodeJS.ProcessEnv} env
 */
export function loadConfig(env = process.env) {
  const drivers = {
    db: driver(env, 'DB_DRIVER'),
    cache: driver(env, 'CACHE_DRIVER'),
    storage: driver(env, 'STORAGE_DRIVER'),
    mail: driver(env, 'MAIL_DRIVER'),
  };

  const port = integer(env, 'PORT', 3001);
  const dataDir = path.resolve(env.LOCAL_DATA_DIR || '.local');
  const usesRedisSecret = drivers.cache === 'redis' && !env.REDIS_URL;

  return Object.freeze({
    drivers,
    http: {
      port,
      corsOrigin: env.CORS_ORIGIN || 'http://localhost:5173',
      appBaseUrl: env.APP_BASE_URL || 'http://localhost:5173',
      apiBaseUrl: env.API_BASE_URL || `http://localhost:${port}`,
    },
    security: {
      bcryptCost: integer(env, 'BCRYPT_COST', 12),
    },
    aws: {
      region: env.AWS_REGION || 'us-east-1',
    },
    dynamodb: {
      table: required(env, 'DYNAMODB_TABLE', drivers.db === 'dynamodb'),
      endpoint: env.DYNAMODB_ENDPOINT || undefined,
    },
    s3: {
      bucket: required(env, 'S3_BUCKET', drivers.storage === 's3'),
    },
    images: {
      baseUrl: env.IMAGES_BASE_URL || `http://localhost:${port}/local-storage/objects`,
    },
    ses: {
      fromAddress: required(env, 'SES_FROM_ADDRESS', drivers.mail === 'ses'),
    },
    redis: {
      url: env.REDIS_URL || undefined,
      host: required(env, 'REDIS_HOST', usesRedisSecret),
      port: integer(env, 'REDIS_PORT', 6379),
      tls: env.REDIS_TLS === 'true',
      secretArn: env.REDIS_SECRET_ARN || undefined,
    },
    local: {
      dataDir,
      memoryDbFile: env.MEMORY_DB_FILE || undefined,
      storageSigningSecret: env.LOCAL_STORAGE_SIGNING_SECRET || undefined,
    },
  });
}
