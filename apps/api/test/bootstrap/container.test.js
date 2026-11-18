import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildContainer } from '../../src/bootstrap/container.js';
import { loadConfig } from '../../src/config/env.js';

describe('container.close', () => {
  it('resolves with the in-memory adapters', async () => {
    const container = buildContainer(loadConfig({}));
    assert.equal(await container.close(), undefined);
  });

  it('resolves with DynamoDB and Redis adapters that never connected', async () => {
    const container = buildContainer(
      loadConfig({
        DB_DRIVER: 'dynamodb',
        CACHE_DRIVER: 'redis',
        DYNAMODB_TABLE: 'unused',
        REDIS_URL: 'redis://localhost:1',
      }),
    );
    assert.equal(await container.close(), undefined);
  });
});
