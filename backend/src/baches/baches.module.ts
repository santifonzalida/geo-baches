import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BachesController } from './baches.controller';
import { BachesService } from './baches.service';
import { ConfirmacionesController } from './confirmaciones.controller';
import { ConfirmacionesService } from './confirmaciones.service';
import { FotosService } from './fotos.service';
import { Bache } from './entities/bache.entity';
import { Confirmacion } from './entities/confirmacion.entity';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([Bache, Confirmacion]), StorageModule],
  controllers: [BachesController, ConfirmacionesController],
  providers: [BachesService, FotosService, ConfirmacionesService],
})
export class BachesModule {}
