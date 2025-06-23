import { Module } from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { VoucherController } from './voucher.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpecialOffer, UserVoucher } from './entities/voucher.entity';
import { CouponModule } from 'src/coupon/coupon.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SpecialOffer, UserVoucher]),
    CouponModule,
  ],
  controllers: [VoucherController],
  providers: [VoucherService],
})
export class VoucherModule {}
