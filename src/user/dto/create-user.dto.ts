// src/user/dto/create-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ example: 'test@gmail.com', description: 'your email' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @ApiProperty({ example: 'password', description: 'unique string' })
  password: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'test test', description: 'your name' })
  name: string;
}