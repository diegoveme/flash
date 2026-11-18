import path from 'node:path';
import { createUseCases } from '../application/index.js';
import { loadConfig } from '../config/env.js';
import { createS3ObjectStorage } from '../infrastructure/aws/s3ObjectStorage.js';
import { createSecretsProvider } from '../infrastructure/aws/secretsProvider.js';
import { createSesMailer } from '../infrastructure/aws/sesMailer.js';
import { createDynamoRepositories } from '../infrastructure/dynamodb/index.js';
import { createLocalObjectStorage } from '../infrastructure/local/localObjectStorage.js';
import { createOutboxMailer } from '../infrastructure/local/outboxMailer.js';
import { createMemoryDatabase } from '../infrastructure/memory/memoryDatabase.js';
import { createMemoryRepositories } from '../infrastructure/memory/index.js';
import { createMemoryPasswordResetStore } from '../infrastructure/memory/passwordResetStore.js';
import { createRedisConnector } from '../infrastructure/redis/client.js';
import { createRedisPasswordResetStore } from '../infrastructure/redis/passwordResetStore.js';
import { createBcryptPasswordHasher } from '../infrastructure/security/bcryptPasswordHasher.js';
import { systemClock } from '../lib/clock.js';
import { logger as defaultLogger } from '../lib/logger.js';

function buildRepositories(config) {
  if (config.drivers.db === 'dynamodb') {
    return createDynamoRepositories({
      region: config.aws.region,
      endpoint: config.dynamodb.endpoint,
      table: config.dynamodb.table,
    });
  }
  return createMemoryRepositories(createMemoryDatabase({ file: config.local.memoryDbFile }));
}

function buildPasswordResetStore(config, { clock, logger }) {
  if (config.drivers.cache === 'redis') {
    const secrets = createSecretsProvider({ region: config.aws.region });
    const { getClient, close } = createRedisConnector(config, secrets, logger);
    return { store: createRedisPasswordResetStore(getClient), close };
  }
  return { store: createMemoryPasswordResetStore({ clock }) };
}

function buildStorage(config, { clock }) {
  if (config.drivers.storage === 's3') {
    return createS3ObjectStorage({
      region: config.aws.region,
      bucket: config.s3.bucket,
      imagesBaseUrl: config.images.baseUrl,
    });
  }
  return createLocalObjectStorage({
    rootDir: path.join(config.local.dataDir, 'storage'),
    apiBaseUrl: config.http.apiBaseUrl,
    imagesBaseUrl: config.images.baseUrl,
    signingSecret: config.local.storageSigningSecret,
    clock,
  });
}

function buildMailer(config, { clock, logger }) {
  if (config.drivers.mail === 'ses') {
    return createSesMailer({ region: config.aws.region, fromAddress: config.ses.fromAddress });
  }
  return createOutboxMailer({ dir: path.join(config.local.dataDir, 'outbox'), clock, logger });
}

/**
 * Composition root: picks one adapter per port based on the configured
 * drivers and wires the use cases. Tests pass overrides (clock, adapters).
 * @param {ReturnType<typeof loadConfig>} config
 * @param {Partial<Record<string, unknown>>} [overrides]
 */
export function buildContainer(config, overrides = {}) {
  const clock = overrides.clock ?? systemClock;
  const logger = overrides.logger ?? defaultLogger;
  const { close: closeRepositories, ...repositories } = buildRepositories(config);
  const passwordResets = buildPasswordResetStore(config, { clock, logger });

  const deps = {
    config,
    clock,
    logger,
    ...repositories,
    passwordResets: passwordResets.store,
    storage: buildStorage(config, { clock }),
    mailer: buildMailer(config, { clock, logger }),
    passwordHasher: createBcryptPasswordHasher({ cost: config.security.bcryptCost }),
    ...overrides,
  };

  const closers = [closeRepositories, passwordResets.close].filter(Boolean);

  return {
    ...deps,
    useCases: createUseCases(deps),
    /** Releases open connections (DynamoDB, Redis). Lambda never needs it; tests and scripts do. */
    close: () => Promise.all(closers.map((close) => close())).then(() => undefined),
  };
}

let current = null;

/** One container per process (per warm Lambda container). */
export function getContainer() {
  current ??= buildContainer(loadConfig());
  return current;
}

/** Test hook: replaces the process-wide container used by HTTP handlers. */
export function setContainer(container) {
  current = container;
}
