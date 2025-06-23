import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserCreationResponseDto } from './dto/user-creation-response.dto';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = {
  hash: jest.fn() as any,
};
(bcrypt as any).hash = mockedBcrypt.hash;

describe('UserService', () => {
  let service: UserService;
  let userRepository: Repository<User>;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedpassword',
    name: 'Test User',
  };

  const mockUserResponse: UserCreationResponseDto = {
    email: 'test@example.com',
    name: 'Test User',
  };

  const createUserDto: CreateUserDto = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));

    // Reset bcrypt mock
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should find a user by email successfully', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.findOne('test@example.com');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    });

    it('should return null when user is not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await service.findOne('nonexistent@example.com');

      expect(result).toBeNull();
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: 'nonexistent@example.com' } });
    });

    it('should handle repository errors gracefully', async () => {
      jest.spyOn(userRepository, 'findOne').mockRejectedValue(new Error('Database error'));

      await expect(service.findOne('test@example.com')).rejects.toThrow('Database error');
    });
  });

  describe('create', () => {
    beforeEach(() => {
      // Mock bcrypt.hash to return a hashed password
      mockedBcrypt.hash.mockResolvedValue('hashedpassword');
    });

    it('should create a user successfully', async () => {
      // Mock that user doesn't exist
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      
      // Mock saving the user
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUserResponse);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: createUserDto.email } });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: createUserDto.email,
          name: createUserDto.name,
          password: 'hashedpassword',
        })
      );
    });

    it('should throw BadRequestException when user with email already exists', async () => {
      // Mock that user already exists
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createUserDto)).rejects.toThrow('User with this email already exists');

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: createUserDto.email } });
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
    });

    it('should handle bcrypt hashing errors gracefully', async () => {
      // Mock that user doesn't exist
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      
      // Mock bcrypt.hash to throw an error
      mockedBcrypt.hash.mockRejectedValue(new Error('Hashing error'));

      await expect(service.create(createUserDto)).rejects.toThrow('Hashing error');

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: createUserDto.email } });
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should handle repository save errors gracefully', async () => {
      // Mock that user doesn't exist
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      
      // Mock repository save to throw an error
      jest.spyOn(userRepository, 'save').mockRejectedValue(new Error('Database save error'));

      await expect(service.create(createUserDto)).rejects.toThrow('Database save error');

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: createUserDto.email } });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
    });

    it('should handle repository findOne errors during duplicate check', async () => {
      // Mock repository findOne to throw an error during duplicate check
      jest.spyOn(userRepository, 'findOne').mockRejectedValue(new Error('Database find error'));

      await expect(service.create(createUserDto)).rejects.toThrow('Database find error');

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: createUserDto.email } });
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
    });

    it('should create user with different email formats', async () => {
      const testCases = [
        'user@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        '123@test.com',
      ];

      for (const email of testCases) {
        const userDto = { ...createUserDto, email };
        const mockUserWithEmail = { ...mockUser, email };
        const expectedResponse = { ...mockUserResponse, email };

        // Mock that user doesn't exist
        jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
        
        // Mock saving the user
        jest.spyOn(userRepository, 'save').mockResolvedValue(mockUserWithEmail);

        const result = await service.create(userDto);

        expect(result).toEqual(expectedResponse);
        expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email } });
        expect(mockedBcrypt.hash).toHaveBeenCalledWith(userDto.password, 10);
      }
    });

    it('should create user with different name formats', async () => {
      const testCases = [
        'John Doe',
        'Jane Smith',
        'Test User',
        'User123',
        'A', // Single character name
      ];

      for (const name of testCases) {
        const userDto = { ...createUserDto, name };
        const mockUserWithName = { ...mockUser, name };
        const expectedResponse = { ...mockUserResponse, name };

        // Mock that user doesn't exist
        jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
        
        // Mock saving the user
        jest.spyOn(userRepository, 'save').mockResolvedValue(mockUserWithName);

        const result = await service.create(userDto);

        expect(result).toEqual(expectedResponse);
        expect(userRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            name,
          })
        );
      }
    });

    it('should hash password with correct salt rounds', async () => {
      // Mock that user doesn't exist
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      
      // Mock saving the user
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);

      await service.create(createUserDto);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
    });

    it('should not include password in response', async () => {
      // Mock that user doesn't exist
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      
      // Mock saving the user
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUserResponse);
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('id');
    });
  });
});
