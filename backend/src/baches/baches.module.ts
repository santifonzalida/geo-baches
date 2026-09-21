import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BachesController } from './baches.controller';
import { BachesService } from './baches.service';
import { FotosService } from './fotos.service';
import { Bache } from './entities/bache.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bache])],
  controllers: [BachesController],
  providers: [BachesService, FotosService],
})
export class BachesModule {}
