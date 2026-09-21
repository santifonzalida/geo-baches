import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bache, EstadoBache } from './entities/bache.entity';
import { CreateBacheDto } from './dto/create-bache.dto';

@Injectable()
export class BachesService {
  constructor(
    @InjectRepository(Bache)
    private readonly bachesRepository: Repository<Bache>,
  ) {}

  /** Solo los baches aprobados: lo que ve el mapa público. */
  findAprobados(): Promise<Bache[]> {
    return this.bachesRepository.find({ where: { revisado: true }, order: { fecha: 'DESC' } });
  }

  /** Baches recién reportados, a la espera de revisión. */
  findPendientes(): Promise<Bache[]> {
    return this.bachesRepository.find({ where: { revisado: false }, order: { fecha: 'DESC' } });
  }

  async create(dto: CreateBacheDto, fotoUrl: string | null): Promise<Bache> {
    const bache = this.bachesRepository.create({
      ...dto,
      calle: dto.calle?.trim() || null,
      altura: dto.altura?.trim() || null,
      barrio: dto.barrio?.trim() || null,
      fotoUrl,
      revisado: false,
    });
    return this.bachesRepository.save(bache);
  }

  async aprobar(id: string): Promise<Bache> {
    const bache = await this.bachesRepository.findOneBy({ id });
    if (!bache) {
      throw new NotFoundException(`No existe un bache con id ${id}`);
    }
    bache.revisado = true;
    return this.bachesRepository.save(bache);
  }

  async updateEstado(id: string, estado: EstadoBache): Promise<Bache> {
    const bache = await this.bachesRepository.findOneBy({ id });
    if (!bache) {
      throw new NotFoundException(`No existe un bache con id ${id}`);
    }
    bache.estado = estado;
    return this.bachesRepository.save(bache);
  }

  async remove(id: string): Promise<void> {
    const resultado = await this.bachesRepository.delete(id);
    if (!resultado.affected) {
      throw new NotFoundException(`No existe un bache con id ${id}`);
    }
  }
}
