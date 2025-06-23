import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserCreationResponseDto } from './dto/user-creation-response.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  findOne(email: string): Promise<User | null>{
    return this.userRepository.findOne({ where: { email } })
  };

  async create(createUserDto: CreateUserDto): Promise<UserCreationResponseDto> {

    if (await this.findOne(createUserDto.email)) {
      throw new BadRequestException('User with this email already exists');
    }
    const user = new User();
    user.email = createUserDto.email;
    user.name = createUserDto.name;
    user.password = await bcrypt.hash(createUserDto.password, 10);
    const result = await this.userRepository.save(user);
    const response: UserCreationResponseDto = {
      email: result.email,
      name: result.name,
    }
    return response;
  }
}
