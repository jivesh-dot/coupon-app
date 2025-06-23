import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly client: Redis
  ) {}

  async addToSet(setKey: string, values: string[]) {
    await this.client.sadd(setKey, ...values);
  }

  async getSetMembers(setKey: string): Promise<string[]> {
    return this.client.smembers(setKey);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }
}