import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { VoucherController } from './voucher.controller';
import { VoucherService } from './voucher.service';
import { AuthGuard } from '@nestjs/passport';
import * as request from 'supertest';
import { JwtUserPayload } from 'src/auth/types/jwt-user-payload.interface';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { RedeemVoucherDto } from './dto/update-voucher.dto';
import { VoucherResponseDto } from './dto/voucher-response.dto';

// Mock JWT Auth Guard
@Injectable()
class MockJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = { userId: 1, email: 'test@example.com' } as JwtUserPayload;
    return true;
  }
}

describe('VoucherController', () => {
  let app: INestApplication;
  let voucherService: VoucherService;

  const mockUser: JwtUserPayload = {
    userId: 1,
    email: 'test@example.com',
  };

  const mockVoucherResponse: any = {
    voucherCode: 'ABC123',
    description: 'Launch Offer',
    expirationDate: '2025-12-31T00:00:00.000Z',
    discountAmount: 10,
  };

  const mockUserVouchers: any[] = [
    {
      id: 1,
      voucherCode: 'ABC123',
      isRedeemed: false,
      redeemedAt: '2025-06-22T17:25:50.584Z',
      user: { id: 1, email: 'test@example.com', password: 'hashedpassword', name: 'Test User' },
      specialOffer: {
        id: 1,
        description: 'Launch Offer',
        discountAmount: 10,
        expirationDate: '2025-12-31T00:00:00.000Z',
      },
    },
  ];

  const mockSpecialOffers: any[] = [
    {
      id: 1,
      description: 'Launch Offer',
      discountAmount: 10,
      expirationDate: '2025-12-31T00:00:00.000Z',
    },
    {
      id: 2,
      description: 'Holiday Special',
      discountAmount: 20,
      expirationDate: '2025-06-30T00:00:00.000Z',
    },
  ];

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [VoucherController],
      providers: [
        {
          provide: VoucherService,
          useValue: {
            create: jest.fn(),
            redeemVoucher: jest.fn(),
            findAll: jest.fn(),
            findSpecialOffers: jest.fn(),
          },
        },
      ],
    })
    .overrideGuard(AuthGuard('jwt'))
    .useClass(MockJwtAuthGuard)
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }));
    await app.init();

    voucherService = moduleFixture.get<VoucherService>(VoucherService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /voucher', () => {
    const createVoucherDto: CreateVoucherDto = {
      specialOfferId: 1,
    };

    it('should create a voucher successfully', async () => {
      jest.spyOn(voucherService, 'create').mockResolvedValue(mockVoucherResponse);

      await request(app.getHttpServer())
        .post('/voucher')
        .send(createVoucherDto)
        .expect(201)
        .expect(mockVoucherResponse);

      expect(voucherService.create).toHaveBeenCalledWith(mockUser, createVoucherDto);
    });

    it('should return 400 for invalid input - missing specialOfferId', async () => {
      await request(app.getHttpServer())
        .post('/voucher')
        .send({})
        .expect(400);
    });

    it('should return 400 for invalid input - specialOfferId not a number', async () => {
      await request(app.getHttpServer())
        .post('/voucher')
        .send({ specialOfferId: 'invalid' })
        .expect(400);
    });

    it('should handle service errors gracefully', async () => {
      jest.spyOn(voucherService, 'create').mockRejectedValue(new Error('Service error'));

      await request(app.getHttpServer())
        .post('/voucher')
        .send(createVoucherDto)
        .expect(500);
    });
  });

  describe('PATCH /voucher/redeem', () => {
    const redeemVoucherDto: RedeemVoucherDto = {
      voucherCode: 'ABC123',
    };

    it('should redeem a voucher successfully', async () => {
      jest.spyOn(voucherService, 'redeemVoucher').mockResolvedValue('success');

      await request(app.getHttpServer())
        .patch('/voucher/redeem')
        .send(redeemVoucherDto)
        .expect(200)
        .expect('success');

      expect(voucherService.redeemVoucher).toHaveBeenCalledWith(mockUser, redeemVoucherDto);
    });

    it('should return 400 for invalid input - missing voucherCode', async () => {
      await request(app.getHttpServer())
        .patch('/voucher/redeem')
        .send({})
        .expect(400);
    });

    it('should return 400 for invalid input - voucherCode not a string', async () => {
      await request(app.getHttpServer())
        .patch('/voucher/redeem')
        .send({ voucherCode: 123 })
        .expect(400);
    });

    it('should handle NotFoundException from service', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      jest.spyOn(voucherService, 'redeemVoucher').mockRejectedValue(new NotFoundException('Voucher not found'));

      await request(app.getHttpServer())
        .patch('/voucher/redeem')
        .send(redeemVoucherDto)
        .expect(404);
    });

    it('should handle BadRequestException from service', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      jest.spyOn(voucherService, 'redeemVoucher').mockRejectedValue(new BadRequestException('Voucher already redeemed'));

      await request(app.getHttpServer())
        .patch('/voucher/redeem')
        .send(redeemVoucherDto)
        .expect(400);
    });
  });

  describe('GET /voucher', () => {
    it('should return user vouchers successfully', async () => {
      jest.spyOn(voucherService, 'findAll').mockResolvedValue(mockUserVouchers);

      await request(app.getHttpServer())
        .get('/voucher')
        .expect(200)
        .expect(mockUserVouchers);

      expect(voucherService.findAll).toHaveBeenCalledWith(mockUser);
    });

    it('should handle service errors gracefully', async () => {
      jest.spyOn(voucherService, 'findAll').mockRejectedValue(new Error('Service error'));

      await request(app.getHttpServer())
        .get('/voucher')
        .expect(500);
    });
  });

  describe('GET /voucher/special-offers', () => {
    it('should return special offers successfully', async () => {
      jest.spyOn(voucherService, 'findSpecialOffers').mockResolvedValue(mockSpecialOffers);

      await request(app.getHttpServer())
        .get('/voucher/special-offers')
        .expect(200)
        .expect(mockSpecialOffers);

      expect(voucherService.findSpecialOffers).toHaveBeenCalled();
    });

    it('should return empty array when no special offers exist', async () => {
      jest.spyOn(voucherService, 'findSpecialOffers').mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/voucher/special-offers')
        .expect(200)
        .expect([]);
    });
  });
});


