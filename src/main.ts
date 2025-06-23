import * as crypto from 'crypto';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationPipe } from '@nestjs/common';

// Define crypto globally if not present
if (!(global as any).crypto) {
  (global as any).crypto = crypto;
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Coupon Service API')
    .setDescription('API for managing coupons and voucher codes')
    .setVersion('1.0')
    .addTag('coupons')
    .build();

    app.useGlobalPipes(new ValidationPipe({
      whitelist: true, // strips non-decorated fields (like `test`)
      forbidNonWhitelisted: true, // throws error for extra fields
      transform: true, // transforms payloads to DTO instances
    }));

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
