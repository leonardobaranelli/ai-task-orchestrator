import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClientType;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const useTls = this.configService.get<string>('REDIS_TLS') === 'true';

    this.client = createClient({
      socket: {
        host,
        port,
        tls: useTls,
      },
      password: password || undefined,
    });

    this.client.on('error', (err: Error) => this.logger.error('Redis client error', err.stack));
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    this.logger.log('Redis connected successfully');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  getClient(): RedisClientType {
    return this.client;
  }
}
