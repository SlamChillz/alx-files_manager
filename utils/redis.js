/**
 * Redis _client utility class
 */
import { promisify } from 'util';
import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this._client = createClient();
    this.connected = true;
    this._client.on('error', (err) => {
      console.log('Redis connection error:', err.message || err.toString());
      this.connected = false;
    });
  }

  isAlive() {
    return this.connected;
  }

  async get(key) {
    const GET = promisify(this._client.GET);
    return GET.call(this._client, key);
  }

  async set(key, value, expires) {
    const SETEX = promisify(this._client.SETEX);
    await SETEX.call(this._client, key, expires, value);
  }

  async del(key) {
    const DEL = promisify(this._client.DEL);
    return DEL.call(this._client, key);
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
