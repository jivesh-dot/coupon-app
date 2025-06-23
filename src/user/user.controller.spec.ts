import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import * as request from 'supertest';
import { CreateUserDto } from './dto/create-user.dto';
import { UserCreationResponseDto } from './dto/user-creation-response.dto';
import { BadRequestException } from '@nestjs/common';

describe('UserController', () => {
  let app: INestApplication;
  let userService: UserService;

  const mockUserResponse: UserCreationResponseDto = {
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
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

    userService = moduleFixture.get<UserService>(UserService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /users', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should create a user successfully', async () => {
      jest.spyOn(userService, 'create').mockResolvedValue(mockUserResponse);

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201)
        .expect(mockUserResponse);

      expect(userService.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should return 400 for invalid email format', async () => {
      const invalidUserDto = {
        ...createUserDto,
        email: 'invalid-email',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(invalidUserDto)
        .expect(400);
    });

    it('should return 400 for password too short', async () => {
      const invalidUserDto = {
        ...createUserDto,
        password: '123', // Less than 6 characters
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(invalidUserDto)
        .expect(400);
    });

    it('should return 400 for missing required fields', async () => {
      const invalidUserDto = {
        email: 'test@example.com',
        // Missing password and name
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(invalidUserDto)
        .expect(400);
    });

    it('should return 400 for empty name', async () => {
      const invalidUserDto = {
        ...createUserDto,
        name: '',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(invalidUserDto)
        .expect(400);
    });

    it('should return 400 for non-string password', async () => {
      const invalidUserDto = {
        ...createUserDto,
        password: 123456, // Number instead of string
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(invalidUserDto)
        .expect(400);
    });

    it('should return 400 when user with email already exists', async () => {
      jest.spyOn(userService, 'create').mockRejectedValue(
        new BadRequestException('User with this email already exists')
      );

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(400)
        .expect({
          statusCode: 400,
          message: 'User with this email already exists',
          error: 'Bad Request',
        });
    });

    it('should reject additional properties not in DTO', async () => {
      const userDtoWithExtraFields = {
        ...createUserDto,
        extraField: 'should be rejected',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(userDtoWithExtraFields)
        .expect(400);
    });

    it('should handle valid email with different formats', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
      ];

      for (const email of validEmails) {
        const userDto = { ...createUserDto, email };
        jest.spyOn(userService, 'create').mockResolvedValue({ ...mockUserResponse, email });

        await request(app.getHttpServer())
          .post('/users')
          .send(userDto)
          .expect(201);

        expect(userService.create).toHaveBeenCalledWith(userDto);
      }
    });

    it('should handle minimum valid password length', async () => {
      const userDtoWithMinPassword = {
        ...createUserDto,
        password: '123456', // Exactly 6 characters
      };

      jest.spyOn(userService, 'create').mockResolvedValue(mockUserResponse);

      await request(app.getHttpServer())
        .post('/users')
        .send(userDtoWithMinPassword)
        .expect(201);

      expect(userService.create).toHaveBeenCalledWith(userDtoWithMinPassword);
    });
  });
});
