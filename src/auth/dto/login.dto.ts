import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @ApiProperty({ example: 'test@test.com', description: 'your email' })
  email: string;

  @IsString()
  @MinLength(6)
  @ApiProperty({ example: 'password', description: 'your email' })
  password: string;
}