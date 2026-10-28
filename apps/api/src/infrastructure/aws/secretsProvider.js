import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

/**
 * Reads JSON secrets from AWS Secrets Manager and caches them for the life of
 * the Lambda container. Secret values are never logged.
 * @param {{ region: string }} options
 */
export function createSecretsProvider({ region }) {
  let client;
  const cache = new Map();

  return {
    async getJson(secretArn) {
      if (!cache.has(secretArn)) {
        client ??= new SecretsManagerClient({ region });
        const request = client
          .send(new GetSecretValueCommand({ SecretId: secretArn }))
          .then((result) => JSON.parse(result.SecretString ?? '{}'));
        cache.set(secretArn, request);
        request.catch(() => cache.delete(secretArn));
      }
      return cache.get(secretArn);
    },
  };
}
