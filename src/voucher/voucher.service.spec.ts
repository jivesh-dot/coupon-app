import { Test, TestingModule } from '@nestjs/testing';
import { VoucherService } from './voucher.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserVoucher, SpecialOffer } from './entities/voucher.entity';
import { Repository } from 'typeorm';
import { CouponCodeGeneratorService } from 'src/coupon/coupon.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { RedeemVoucherDto } from './dto/update-voucher.dto';
import { JwtUserPayload } from 'src/auth/types/jwt-user-payload.interface';
import { VoucherResponseDto } from './dto/voucher-response.dto';

describe('VoucherService', () => {
  let service: VoucherService;
  let userVoucherRepository: Repository<UserVoucher>;
  let specialOfferRepository: Repository<SpecialOffer>;
  let redisMock: any;
  let couponCodeGeneratorService: CouponCodeGeneratorService;

  const mockUser: JwtUserPayload = {
    userId: 1,
    email: 'test@example.com',
  };

  const mockSpecialOffer: SpecialOffer = {
    id: 1,
    description: 'Launch Offer',
    discountAmount: 10,
    expirationDate: new Date('2025-12-31'),
  };

  const mockUserVoucher: UserVoucher = {
    id: 1,
    voucherCode: 'ABC123',
    isRedeemed: false,
    redeemedAt: new Date(),
    user: { id: 1, email: 'test@example.com', password: 'hashedpassword', name: 'Test User' },
    specialOffer: mockSpecialOffer,
  };

  const mockVoucherResponse: VoucherResponseDto = {
    voucherCode: 'ABC123',
    description: 'Launch Offer',
    expirationDate: new Date('2025-12-31'),
    discountAmount: 10,
  };

  beforeEach(async () => {
    redisMock = {
      spop: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoucherService,
        {
          provide: getRepositoryToken(UserVoucher),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SpecialOffer),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: 'IORedisModule:Redis',
          useValue: redisMock,
        },
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: redisMock,
        },
        {
          provide: CouponCodeGeneratorService,
          useValue: {
            generateAndStoreCoupons: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VoucherService>(VoucherService);
    userVoucherRepository = module.get<Repository<UserVoucher>>(getRepositoryToken(UserVoucher));
    specialOfferRepository = module.get<Repository<SpecialOffer>>(getRepositoryToken(SpecialOffer));
    couponCodeGeneratorService = module.get<CouponCodeGeneratorService>(CouponCodeGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createVoucherDto: CreateVoucherDto = {
      specialOfferId: 1,
    };

    it('should create a voucher successfully with existing coupon code from Redis', async () => {
      // Mock Redis returning an existing coupon code
      (jest.spyOn(redisMock, 'spop') as any).mockResolvedValue('ABC123');
      
      // Mock finding the special offer
      jest.spyOn(specialOfferRepository, 'findOne').mockResolvedValue(mockSpecialOffer);
      
      // Mock creating and saving the user voucher
      jest.spyOn(userVoucherRepository, 'create').mockReturnValue(mockUserVoucher);
      jest.spyOn(userVoucherRepository, 'save').mockResolvedValue(mockUserVoucher);

      const result = await service.create(mockUser, createVoucherDto);

      expect(result).toEqual(mockVoucherResponse);
      expect(redisMock.spop).toHaveBeenCalledWith('available-coupons');
      expect(specialOfferRepository.findOne).toHaveBeenCalledWith({
        where: { id: createVoucherDto.specialOfferId },
      });
      expect(userVoucherRepository.create).toHaveBeenCalledWith({
        specialOffer: mockSpecialOffer,
        voucherCode: 'ABC123',
        user: { id: mockUser.userId },
      });
      expect(userVoucherRepository.save).toHaveBeenCalledWith(mockUserVoucher);
    });

    it('should create a voucher successfully by generating new coupon code when Redis is empty', async () => {
      // Mock Redis returning null (no existing codes)
      (jest.spyOn(redisMock, 'spop') as any).mockResolvedValue(null);
      
      // Mock generating a new coupon code
      jest.spyOn(couponCodeGeneratorService, 'generateAndStoreCoupons').mockResolvedValue('XYZ789');
      
      // Mock finding the special offer
      jest.spyOn(specialOfferRepository, 'findOne').mockResolvedValue(mockSpecialOffer);
      
      // Mock creating and saving the user voucher
      const mockUserVoucherWithNewCode = { ...mockUserVoucher, voucherCode: 'XYZ789' };
      jest.spyOn(userVoucherRepository, 'create').mockReturnValue(mockUserVoucherWithNewCode);
      jest.spyOn(userVoucherRepository, 'save').mockResolvedValue(mockUserVoucherWithNewCode);

      const result = await service.create(mockUser, createVoucherDto);

      expect(result.voucherCode).toBe('XYZ789');
      expect(redisMock.spop).toHaveBeenCalledWith('available-coupons');
      expect(couponCodeGeneratorService.generateAndStoreCoupons).toHaveBeenCalledWith(1);
    });

    it('should throw an error when special offer is not found', async () => {
      // Mock Redis returning a coupon code
      (jest.spyOn(redisMock, 'spop') as any).mockResolvedValue('ABC123');
      
      // Mock not finding the special offer
      jest.spyOn(specialOfferRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(mockUser, createVoucherDto)).rejects.toThrow('Special offer not found');
      
      expect(specialOfferRepository.findOne).toHaveBeenCalledWith({
        where: { id: createVoucherDto.specialOfferId },
      });
    });

    it('should handle repository save errors gracefully', async () => {
      // Mock Redis returning a coupon code
      (jest.spyOn(redisMock, 'spop') as any).mockResolvedValue('ABC123');
      
      // Mock finding the special offer
      jest.spyOn(specialOfferRepository, 'findOne').mockResolvedValue(mockSpecialOffer);
      
      // Mock creating the user voucher
      jest.spyOn(userVoucherRepository, 'create').mockReturnValue(mockUserVoucher);
      
      // Mock repository save throwing an error
      jest.spyOn(userVoucherRepository, 'save').mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockUser, createVoucherDto)).rejects.toThrow('Database error');
    });
  });

  describe('redeemVoucher', () => {
    const redeemVoucherDto: RedeemVoucherDto = {
      voucherCode: 'ABC123',
    };

    it('should redeem a voucher successfully', async () => {
      const mockUnredeemedVoucher = { ...mockUserVoucher, isRedeemed: false };
      
      // Mock finding the unredeemed voucher
      jest.spyOn(userVoucherRepository, 'findOne').mockResolvedValue(mockUnredeemedVoucher);
      
      // Mock saving the redeemed voucher
      const mockRedeemedVoucher = { 
        ...mockUnredeemedVoucher, 
        isRedeemed: true, 
        redeemedAt: new Date() 
      };
      jest.spyOn(userVoucherRepository, 'save').mockResolvedValue(mockRedeemedVoucher);

      const result = await service.redeemVoucher(mockUser, redeemVoucherDto);

      expect(result).toBe('success');
      expect(userVoucherRepository.findOne).toHaveBeenCalledWith({
        where: { voucherCode: redeemVoucherDto.voucherCode, user: { id: mockUser.userId } },
        relations: ['specialOffer'],
      });
      expect(userVoucherRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isRedeemed: true,
          redeemedAt: expect.any(Date),
        })
      );
    });

    it('should throw BadRequestException when voucher is already expired', async () => {

      const mockExpiredVoucher = {...mockUserVoucher, 
        specialOffer: {...mockSpecialOffer, expirationDate: new Date('2024-12-12')}}
      // Mock not finding the voucher
      jest.spyOn(userVoucherRepository, 'findOne').mockResolvedValue(mockExpiredVoucher);

      await expect(service.redeemVoucher(mockUser, redeemVoucherDto)).rejects.toThrow(BadRequestException);
      await expect(service.redeemVoucher(mockUser, redeemVoucherDto)).rejects.toThrow('Voucher has expired');
    });

    it('should throw NotFoundException when voucher is not found', async () => {
      // Mock not finding the voucher
      jest.spyOn(userVoucherRepository, 'findOne').mockResolvedValue(null);

      await expect(service.redeemVoucher(mockUser, redeemVoucherDto)).rejects.toThrow(NotFoundException);
      await expect(service.redeemVoucher(mockUser, redeemVoucherDto)).rejects.toThrow('Voucher not found');
    });

    it('should throw BadRequestException when voucher is already redeemed', async () => {
      const mockRedeemedVoucher = { ...mockUserVoucher, isRedeemed: true };
      
      // Mock finding an already redeemed voucher
      jest.spyOn(userVoucherRepository, 'findOne').mockResolvedValue(mockRedeemedVoucher);

      await expect(service.redeemVoucher(mockUser, redeemVoucherDto)).rejects.toThrow(BadRequestException);
      await expect(service.redeemVoucher(mockUser, redeemVoucherDto)).rejects.toThrow('Voucher has already been redeemed');
    });

    it('should handle repository save errors gracefully', async () => {
      const mockUnredeemedVoucher = { ...mockUserVoucher, isRedeemed: false };
      
      // Mock finding the unredeemed voucher
      jest.spyOn(userVoucherRepository, 'findOne').mockResolvedValue(mockUnredeemedVoucher);
      
      // Mock repository save throwing an error
      jest.spyOn(userVoucherRepository, 'save').mockRejectedValue(new Error('Database error'));

      await expect(service.redeemVoucher(mockUser, redeemVoucherDto)).rejects.toThrow('Database error');
    });
  });

  describe('findAll', () => {
    it('should return all vouchers for a user', async () => {
      const mockUserVouchers = [mockUserVoucher];
      
      // Mock finding user vouchers
      jest.spyOn(userVoucherRepository, 'find').mockResolvedValue(mockUserVouchers);

      const result = await service.findAll(mockUser);

      expect(result).toEqual(mockUserVouchers);
      expect(userVoucherRepository.find).toHaveBeenCalledWith({
        where: { user: { id: mockUser.userId } },
        relations: ['specialOffer'],
      });
    });

    it('should return empty array when user has no vouchers', async () => {
      // Mock finding no vouchers
      jest.spyOn(userVoucherRepository, 'find').mockResolvedValue([]);

      const result = await service.findAll(mockUser);

      expect(result).toEqual([]);
    });

    it('should handle repository errors gracefully', async () => {
      // Mock repository throwing an error
      jest.spyOn(userVoucherRepository, 'find').mockRejectedValue(new Error('Database error'));

      await expect(service.findAll(mockUser)).rejects.toThrow('Database error');
    });
  });

  describe('findSpecialOffers', () => {
    it('should return all special offers ordered by expiration date', async () => {
      const mockSpecialOffers = [
        { ...mockSpecialOffer, id: 1, expirationDate: new Date('2025-12-31') },
        { ...mockSpecialOffer, id: 2, expirationDate: new Date('2025-06-30') },
      ];
      
      // Mock finding special offers
      jest.spyOn(specialOfferRepository, 'find').mockResolvedValue(mockSpecialOffers);

      const result = await service.findSpecialOffers();

      expect(result).toEqual(mockSpecialOffers);
      expect(specialOfferRepository.find).toHaveBeenCalledWith({
        order: { expirationDate: 'DESC' },
      });
    });

    it('should return empty array when no special offers exist', async () => {
      // Mock finding no special offers
      jest.spyOn(specialOfferRepository, 'find').mockResolvedValue([]);

      const result = await service.findSpecialOffers();

      expect(result).toEqual([]);
    });

    it('should handle repository errors gracefully', async () => {
      // Mock repository throwing an error
      jest.spyOn(specialOfferRepository, 'find').mockRejectedValue(new Error('Database error'));

      await expect(service.findSpecialOffers()).rejects.toThrow('Database error');
    });
  });
});
