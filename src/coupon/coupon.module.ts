import { Module } from '@nestjs/common';
import { CouponController } from './coupon.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { CouponGenerator } from './entities/coupon.entity';
import { Voucher, VoucherSchema } from './mongo/voucher.schema';
import { CouponCodeGeneratorService } from './coupon.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CouponGenerator]),
    MongooseModule.forFeature([
      { name: Voucher.name, schema: VoucherSchema }
    ]),
  ],
  controllers: [CouponController],
  providers: [CouponCodeGeneratorService],
  exports: [CouponCodeGeneratorService],
})
export class CouponModule {}
