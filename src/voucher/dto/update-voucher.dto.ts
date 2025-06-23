import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RedeemVoucherDto {

    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: 'hasf2312', description: 'coupon code' })
    voucherCode: string;

}
