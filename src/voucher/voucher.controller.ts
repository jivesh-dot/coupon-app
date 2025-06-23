import { Controller, Get, Post, Body, Patch, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { AuthGuard } from '@nestjs/passport';
import { RedeemVoucherDto } from './dto/update-voucher.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@Controller('voucher')
// @Throttle({ short: { limit: 1, ttl: 6000 } })
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(AuthGuard('jwt'))
  @Post()
  @UsePipes(new ValidationPipe())
  @ApiOperation({ summary: 'Create a new voucher for a user' })
  @ApiResponse({ status: 201, description: 'Voucher created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(@Body() createVoucherDto: CreateVoucherDto, @Req() req) {
    return this.voucherService.create(req.user, createVoucherDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('redeem')
  @UsePipes(new ValidationPipe())
  @ApiOperation({ summary: 'Redeem existing Voucher' })
  @ApiResponse({ status: 200, description: 'Voucher Redeemed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  redeemVoucher(@Body() RedeemVoucherDto: RedeemVoucherDto, @Req() req) {
    return this.voucherService.redeemVoucher(req.user, RedeemVoucherDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  @ApiOperation({ summary: 'get user vouchers' })
  @ApiResponse({ status: 200, description: 'list of vouchers' })
  findAll(@Req() req) {
    return this.voucherService.findAll(req.user);
  }

  // @UseGuards(AuthGuard('jwt'))
  @Get('special-offers')
  @ApiOperation({ summary: 'get special offers listed (seeded)' })
  @ApiResponse({ status: 200, description: 'list of vouchers' })
  findSpecialOffers() {
    return this.voucherService.findSpecialOffers();
  }

}
