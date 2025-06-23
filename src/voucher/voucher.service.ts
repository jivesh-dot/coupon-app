import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { RedeemVoucherDto } from './dto/update-voucher.dto';
import { SpecialOffer, UserVoucher } from './entities/voucher.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CouponCodeGeneratorService } from 'src/coupon/coupon.service';
import Redis from "ioredis";
import { InjectRedis } from '@nestjs-modules/ioredis';
import { JwtUserPayload } from 'src/auth/types/jwt-user-payload.interface';
import { VoucherResponseDto } from './dto/voucher-response.dto';

@Injectable()
export class VoucherService {

  constructor(
    @InjectRepository(UserVoucher)
    private readonly userVoucherRepository: Repository<UserVoucher>,
    @InjectRepository(SpecialOffer)
    private readonly specialOfferRepository: Repository<SpecialOffer>,
    @InjectRedis() private readonly redisService: Redis,
    private readonly couponCodeGeneratorService: CouponCodeGeneratorService,
  ) {}

  async create(user: JwtUserPayload, createVoucherDto: CreateVoucherDto): Promise<VoucherResponseDto> {

    const userId = user.userId

    const specialOffer = await this.specialOfferRepository.findOne({
      where: { id: createVoucherDto.specialOfferId },
    });

    if (!specialOffer) {
      throw new NotFoundException('Special offer not found');
    }

    // Pop a voucher code from the Redis set
    // If no voucher code is available, generate 1 code and assign to user
    let voucherCode = await this.redisService.spop('available-coupons');

    if (!voucherCode) {
      voucherCode = await this.couponCodeGeneratorService.generateAndStoreCoupons(1);
    }

    const userVoucher = this.userVoucherRepository.create({
      specialOffer,
      voucherCode,
      user: { id: userId },
    })

    const savedVoucher = await this.userVoucherRepository.save(userVoucher);
    const response: VoucherResponseDto = {
      voucherCode: savedVoucher.voucherCode,
      description: savedVoucher.specialOffer.description,
      expirationDate: savedVoucher.specialOffer.expirationDate,
      discountAmount: savedVoucher.specialOffer.discountAmount,
    };
    return response;
  };

  async redeemVoucher(user: JwtUserPayload, RedeemVoucherDto: RedeemVoucherDto): Promise<string> {
    const { voucherCode } = RedeemVoucherDto;
    const userId = user.userId
  
    const userVoucher = await this.userVoucherRepository.findOne({
      where: { voucherCode, user: { id: userId } },
      relations: ['specialOffer'],
    });
  
    if (!userVoucher) {
      throw new NotFoundException('Voucher not found');
    }
  
    if (userVoucher.isRedeemed) {
      throw new BadRequestException('Voucher has already been redeemed');
    }

    if (userVoucher.specialOffer.expirationDate < new Date()) {
      throw new BadRequestException('Voucher has expired');
    }
  
    userVoucher.isRedeemed = true;
    userVoucher.redeemedAt = new Date();
  
    await this.userVoucherRepository.save(userVoucher);
    return 'success';
  }

  async findAll(user: JwtUserPayload) {
    const userId = user.userId
    return await this.userVoucherRepository.find({
      where: { user: { id: userId } },
      relations: ['specialOffer'],
    });
  }

  async findSpecialOffers() {
    return await this.specialOfferRepository.find({
      order: { expirationDate: 'DESC' }
    });
  }

}
