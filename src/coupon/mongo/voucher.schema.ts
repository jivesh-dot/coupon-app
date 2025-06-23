import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Voucher extends Document {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop()
  createdAt: Date;
}

export const VoucherSchema = SchemaFactory.createForClass(Voucher);