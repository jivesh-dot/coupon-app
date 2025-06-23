import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CouponGenerator } from './entities/coupon.entity';
import { encodeBase62 } from 'src/common/filters/uitls.ts/base62.util';
import { DataSource } from 'typeorm';
import { Voucher } from './mongo/voucher.schema';

@Injectable()
export class CouponCodeGeneratorService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectModel(Voucher.name)
    private readonly voucherModel: Model<Voucher>,
  ) {}

  async generateAndStoreCoupons(batchSize = 1000): Promise<string> {

    return await this.dataSource.transaction(async (manager) => {
      const generator = await manager.findOne(CouponGenerator, {
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      });

      if (!generator) throw new Error('CouponGenerator not found');

      const start = generator.generatorNumber + 1;
      const end = start + batchSize - 1;

      generator.generatorNumber = end;
      generator.lastGeneratedAt = new Date();

      await manager.save(generator);

      const codes: string[] = [];
      for (let i = start; i <= end; i++) {
        codes.push(encodeBase62(i));
      }

      // await this.redis.sadd('available-coupons', ...codes);

      const docs = codes.map((code) => ({ code, createdAt: new Date() }));
      await this.voucherModel.insertMany(docs);

      return codes[0];

    });
  }
}
