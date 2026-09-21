import { mkdirSync } from 'fs';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { UPLOADS_DIR } from './config/uploads';

async function bootstrap() {
  mkdirSync(UPLOADS_DIR, { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200' });
  app.useStaticAssets(UPLOADS_DIR, { prefix: '/uploads' });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
