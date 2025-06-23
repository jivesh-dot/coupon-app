import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user payload from JWT token', async () => {
      const mockPayload = {
        sub: 1,
        email: 'test@example.com',
        iat: 1234567890,
        exp: 1234567890,
      };

      const result = await strategy.validate(mockPayload);

      expect(result).toEqual({
        userId: 1,
        email: 'test@example.com',
      });
    });

    it('should handle different user IDs', async () => {
      const mockPayload = {
        sub: 999,
        email: 'another@example.com',
        iat: 1234567890,
        exp: 1234567890,
      };

      const result = await strategy.validate(mockPayload);

      expect(result).toEqual({
        userId: 999,
        email: 'another@example.com',
      });
    });

    it('should handle different email formats', async () => {
      const mockPayload = {
        sub: 1,
        email: 'user.name+tag@domain.co.uk',
        iat: 1234567890,
        exp: 1234567890,
      };

      const result = await strategy.validate(mockPayload);

      expect(result).toEqual({
        userId: 1,
        email: 'user.name+tag@domain.co.uk',
      });
    });

    it('should handle payload with additional properties', async () => {
      const mockPayload = {
        sub: 1,
        email: 'test@example.com',
        role: 'admin',
        permissions: ['read', 'write'],
        iat: 1234567890,
        exp: 1234567890,
      };

      const result = await strategy.validate(mockPayload);

      expect(result).toEqual({
        userId: 1,
        email: 'test@example.com',
      });
    });

    it('should handle payload with only required fields', async () => {
      const mockPayload = {
        sub: 1,
        email: 'test@example.com',
      };

      const result = await strategy.validate(mockPayload);

      expect(result).toEqual({
        userId: 1,
        email: 'test@example.com',
      });
    });
  });

  describe('constructor', () => {
    it('should configure JWT strategy with correct options', () => {
      expect(configService.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
    });

    it('should throw error when JWT_SECRET is not configured', () => {
      const mockConfigService = {
        getOrThrow: jest.fn().mockImplementation(() => {
          throw new Error('JWT_SECRET is not configured');
        }),
      };

      expect(() => {
        new JwtStrategy(mockConfigService as any);
      }).toThrow('JWT_SECRET is not configured');
    });
  });
}); 