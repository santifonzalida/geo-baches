import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactoController } from './contacto.controller';
import { ContactoService } from './contacto.service';
import { MensajeContacto } from './entities/mensaje-contacto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MensajeContacto])],
  controllers: [ContactoController],
  providers: [ContactoService],
})
export class ContactoModule {}
