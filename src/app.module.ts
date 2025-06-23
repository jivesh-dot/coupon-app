import { Module} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { minutes, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { UserModule } from './user/user.module';
import { CouponModule } from './coupon/coupon.module';
import { AuthModule } from './auth/auth.module';
import { VoucherModule } from './voucher/voucher.module';
import { APP_GUARD } from '@nestjs/core';
import { RedisGlobalModule } from './shared/redis/redis.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    
    ThrottlerModule.forRoot([
      {
        name: 'default', // If name is not provided, the name is given as default
        ttl: minutes(1), // Time window in minutes
        limit: 10, // Number of allowed requests in that window
      }
   ]),
    RedisGlobalModule,
    UserModule,
    CouponModule,
    AuthModule,
    VoucherModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ],
})
export class AppModule {}