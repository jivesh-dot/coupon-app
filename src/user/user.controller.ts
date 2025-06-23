import { Controller, Post, Body } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserCreationResponseDto } from './dto/user-creation-response.dto';

@Controller('users')
export class UserController {

  // @UseGuards(AuthGuard('jwt'))
  // @Get('profile')
  // //Testing
  // getProfile(@Request() req) {
  //   return req.user; 
  // }
  constructor(private readonly userService: UserService) {}


  @Post()
  @ApiOperation({ summary: 'create user' })
  @ApiResponse({ status: 200, description: 'succesfully created' })
  @ApiResponse({ status: 400, description: 'invalid input' })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserCreationResponseDto> {
    return this.userService.create(createUserDto);
  }

}
