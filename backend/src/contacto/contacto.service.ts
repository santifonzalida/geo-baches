import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrearMensajeDto } from './dto/crear-mensaje.dto';
import { MensajeContacto } from './entities/mensaje-contacto.entity';

@Injectable()
export class ContactoService {
  constructor(
    @InjectRepository(MensajeContacto)
    private readonly mensajesRepository: Repository<MensajeContacto>,
  ) {}

  /** Guarda el mensaje, salvo que venga de un bot (campo trampa con algo). */
  async crear({ nombre, email, mensaje, sitioWeb }: CrearMensajeDto): Promise<void> {
    if (sitioWeb?.trim()) return;
    await this.mensajesRepository.insert({ nombre, email, mensaje });
  }

  listar(): Promise<MensajeContacto[]> {
    return this.mensajesRepository.find({ order: { fecha: 'DESC' } });
  }

  async eliminar(id: string): Promise<void> {
    const { affected } = await this.mensajesRepository.delete(id);
    if (!affected) throw new NotFoundException(`No existe un mensaje con id ${id}`);
  }
}
