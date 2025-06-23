import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, isNumber, IsString, IsDate} from "class-validator";

export class CreateVoucherDto {

    @IsNumber()
    @ApiProperty({ example: 1, description: 'Special offer ID=1 can be used' })
    specialOfferId: number;

}


