import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import * as request from 'supertest';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';

describe('AuthController', () => {
  let app: INestApplication;
  let authService: AuthService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockLoginResponse = {
    access_token: 'mock-jwt-token',
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
            login: jest.fn(),
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

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }));
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      jest.spyOn(authService, 'validateUser').mockResolvedValue(mockUser);
      jest.spyOn(authService, 'login').mockResolvedValue(mockLoginResponse);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(201)
        .expect(mockLoginResponse);

      expect(authService.validateUser).toHaveBeenCalledWith(loginDto.email, loginDto.password);
      expect(authService.login).toHaveBeenCalledWith(mockUser);
    });

    it('should return 401 for invalid credentials', async () => {
      jest.spyOn(authService, 'validateUser').mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401)
        .expect({
          statusCode: 401,
          message: 'Invalid credentials',
          error: 'Unauthorized',
        });

      expect(authService.validateUser).toHaveBeenCalledWith(loginDto.email, loginDto.password);
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid email format', async () => {
      const invalidLoginDto = {
        ...loginDto,
        email: 'invalid-email',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(invalidLoginDto)
        .expect(400);
    });

    it('should return 400 for missing required fields', async () => {
      const invalidLoginDto = {
        email: 'test@example.com',
        // Missing password
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(invalidLoginDto)
        .expect(400);
    });

    it('should return 400 for empty email', async () => {
      const invalidLoginDto = {
        ...loginDto,
        email: '',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(invalidLoginDto)
        .expect(400);
    });

    it('should handle service errors gracefully', async () => {
      jest.spyOn(authService, 'validateUser').mockRejectedValue(new Error('Database error'));

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(500);
    });


    it('should handle minimum valid password length', async () => {
      const loginDtoWithMinPassword = {
        ...loginDto,
        password: '123456', // Exactly 6 characters
      };

      jest.spyOn(authService, 'validateUser').mockResolvedValue(mockUser);
      jest.spyOn(authService, 'login').mockResolvedValue(mockLoginResponse);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDtoWithMinPassword)
        .expect(201);

      expect(authService.validateUser).toHaveBeenCalledWith(loginDto.email, '123456');
    });

    it('should handle login service errors', async () => {
      jest.spyOn(authService, 'validateUser').mockResolvedValue(mockUser);
      jest.spyOn(authService, 'login').mockRejectedValue(new Error('JWT signing error'));

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(500);
    });
  });
});
