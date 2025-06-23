import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule as IORedisModule } from '@nestjs-modules/ioredis';

@Global()
@Module({
  imports: [
    ConfigModule,
    IORedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: config.get<string>('REDIS_URL'),
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [IORedisModule],
})
export class RedisGlobalModule {}