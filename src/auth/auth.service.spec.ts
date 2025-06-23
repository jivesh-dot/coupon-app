import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = {
  compare: jest.fn() as any,
};

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedpassword',
    name: 'Test User',
  };

  const mockUserWithoutPassword = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockLoginResponse = {
    access_token: 'mock-jwt-token',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);

    // Reset bcrypt mock
    jest.clearAllMocks();
    (bcrypt as any).compare = mockedBcrypt.compare;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    const email = 'test@example.com';
    const password = 'password123';

    it('should validate user successfully with correct credentials', async () => {
      // Mock finding the user
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      
      // Mock bcrypt.compare returning true (password matches)
      mockedBcrypt.compare.mockResolvedValue(true);

      const result = await service.validateUser(email, password);

      expect(result).toEqual(mockUserWithoutPassword);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, mockUser.password);
    });

    it('should return null when user is not found', async () => {
      // Mock not finding the user
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null when password does not match', async () => {
      // Mock finding the user
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      
      // Mock bcrypt.compare returning false (password doesn't match)
      mockedBcrypt.compare.mockResolvedValue(false);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, mockUser.password);
    });

    it('should handle repository errors gracefully', async () => {
      // Mock repository throwing an error
      jest.spyOn(userRepository, 'findOne').mockRejectedValue(new Error('Database error'));

      await expect(service.validateUser(email, password)).rejects.toThrow('Database error');
    });

    it('should handle bcrypt compare errors gracefully', async () => {
      // Mock finding the user
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      
      // Mock bcrypt.compare throwing an error
      mockedBcrypt.compare.mockRejectedValue(new Error('Bcrypt error'));

      await expect(service.validateUser(email, password)).rejects.toThrow('Bcrypt error');
    });

    it('should validate user with different email formats', async () => {
      const testCases = [
        'user@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        '123@test.com',
      ];

      for (const testEmail of testCases) {
        const mockUserWithEmail = { ...mockUser, email: testEmail };
        const mockUserWithoutPasswordWithEmail = { ...mockUserWithoutPassword, email: testEmail };

        // Mock finding the user
        jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUserWithEmail);
        
        // Mock bcrypt.compare returning true
        mockedBcrypt.compare.mockResolvedValue(true);

        const result = await service.validateUser(testEmail, password);

        expect(result).toEqual(mockUserWithoutPasswordWithEmail);
        expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: testEmail } });
      }
    });

    it('should not include password in returned user object', async () => {
      // Mock finding the user
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      
      // Mock bcrypt.compare returning true
      mockedBcrypt.compare.mockResolvedValue(true);

      const result = await service.validateUser(email, password);

      expect(result).not.toHaveProperty('password');
      expect(result).toEqual(mockUserWithoutPassword);
    });
  });

  describe('login', () => {
    const mockUserForLogin = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
    };

    it('should generate JWT token successfully', async () => {
      // Mock JWT service signing
      jest.spyOn(jwtService, 'sign').mockReturnValue('mock-jwt-token');

      const result = await service.login(mockUserForLogin);

      expect(result).toEqual(mockLoginResponse);
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: mockUserForLogin.email,
        sub: mockUserForLogin.id,
      });
    });

    it('should handle JWT signing errors gracefully', async () => {
      // Mock JWT service throwing an error
      jest.spyOn(jwtService, 'sign').mockImplementation(() => {
        throw new Error('JWT signing error');
      });

      await expect(service.login(mockUserForLogin)).rejects.toThrow('JWT signing error');
    });

    it('should generate token with correct payload structure', async () => {
      // Mock JWT service signing
      jest.spyOn(jwtService, 'sign').mockReturnValue('mock-jwt-token');

      await service.login(mockUserForLogin);

      expect(jwtService.sign).toHaveBeenCalledWith({
        email: mockUserForLogin.email,
        sub: mockUserForLogin.id,
      });
    });

    it('should handle different user data structures', async () => {
      const testUsers = [
        { id: 1, email: 'user1@example.com', name: 'User 1' },
        { id: 2, email: 'user2@example.com', name: 'User 2' },
        { id: 999, email: 'admin@example.com', name: 'Admin User' },
      ];

      for (const testUser of testUsers) {
        jest.spyOn(jwtService, 'sign').mockReturnValue('mock-jwt-token');

        const result = await service.login(testUser);

        expect(result).toEqual(mockLoginResponse);
        expect(jwtService.sign).toHaveBeenCalledWith({
          email: testUser.email,
          sub: testUser.id,
        });
      }
    });

    it('should return access_token property in response', async () => {
      // Mock JWT service signing
      jest.spyOn(jwtService, 'sign').mockReturnValue('mock-jwt-token');

      const result = await service.login(mockUserForLogin);

      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('mock-jwt-token');
    });
  });
});
