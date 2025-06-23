import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { SpecialOffer } from 'src/voucher/entities/voucher.entity';
import { CouponGenerator } from 'src/coupon/entities/coupon.entity';
import { encodeBase62 } from 'src/common/filters/uitls.ts/base62.util';
import { Voucher, VoucherSchema } from 'src/coupon/mongo/voucher.schema';


dotenv.config();

const redis = new Redis(process.env.REDIS_URL!);

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: true,
  entities: [SpecialOffer, CouponGenerator],
});

const seedSpecialOffers = async () => {
  const repo = AppDataSource.getRepository(SpecialOffer);
  const alreadySeeded = await repo.count();

  if (alreadySeeded > 0) {
    console.error('SpecialOffer already seeded');
    return;
  }

  await repo.save([
    {
      description: 'Launch Offer',
      discountAmount: 10,
      expirationDate: new Date('2025-12-31'),
    },
  ]);

  console.info('Seeded SpecialOffer');
};

const seedCouponGenerator = async () => {
  const repo = AppDataSource.getRepository(CouponGenerator);

  const existing = await repo.findOne({ where: { id: 1 } });

  if (!existing) {
    const newGenerator = repo.create({
      id: 1,
      description: 'Default coupon generator',
      generatorNumber: 0,
      lastGeneratedAt: new Date(),
    });
    await repo.save(newGenerator);
    console.info('Created initial CouponGenerator row');
  } else {
    console.info('ℹ️ CouponGenerator already exists, skipping creation');
  }
};

const generateAndStoreCoupons = async (batchSize: number = 1000) => {
  const repo = AppDataSource.getRepository(CouponGenerator);

  await AppDataSource.transaction(async (manager) => {
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

    await redis.sadd('available-coupons', ...codes);

    const VoucherModel = mongoose.model('Voucher', VoucherSchema);
    const docs = codes.map((code) => ({ code, createdAt: new Date() }));
    await VoucherModel.insertMany(docs);

    console.info(`Generated and stored ${codes.length} coupons.`);
  });
};

// MAIN RUNNER
const runSeedScripts = async () => {
  try {
    await AppDataSource.initialize();
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in .env');
    }
    await mongoose.connect(mongoUri); // Ensure MONGO_URI is in your .env

    await seedCouponGenerator();
    await seedSpecialOffers();
    await generateAndStoreCoupons(1000);

    await mongoose.disconnect();
    await redis.quit();
    await AppDataSource.destroy();
    console.info('All seed operations completed');
  } catch (err) {
    console.error('Error running seeds:', err);
    process.exit(1);
  }
};

runSeedScripts();