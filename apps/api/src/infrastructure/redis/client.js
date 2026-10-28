import { createClient } from 'redis';

/**
 * Lazily connects to Redis/Valkey on first use and reuses the connection
 * across Lambda invocations. Locally it uses REDIS_URL; on AWS it reads the
 * ElastiCache user credentials from Secrets Manager.
 * @param {{ redis: { url?: string, host?: string, port: number, tls: boolean, secretArn?: string } }} config
 * @param {{ getJson: (arn: string) => Promise<Record<string, string>> }} secrets
 * @param {{ error: Function }} logger
 */
export function createRedisConnector(config, secrets, logger) {
  let connecting = null;

  async function connect() {
    const { url, host, port, tls, secretArn } = config.redis;
    let options;
    if (url) {
      options = { url };
    } else {
      const credentials = secretArn ? await secrets.getJson(secretArn) : {};
      options = {
        socket: { host, port, tls },
        username: credentials.username,
        password: credentials.password,
      };
    }

    const client = createClient(options);
    client.on('error', (error) => logger.error('Redis client error', { error }));
    await client.connect();
    return client;
  }

  return function getClient() {
    connecting ??= connect().catch((error) => {
      connecting = null;
      throw error;
    });
    return connecting;
  };
}
