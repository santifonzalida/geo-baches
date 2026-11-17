import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bache } from './entities/bache.entity';
import { Confirmacion, TipoConfirmacion } from './entities/confirmacion.entity';

export interface ResumenConfirmaciones {
  sigue: number;
  arreglado: number;
}

export interface ResumenConfirmacionesDispositivo extends ResumenConfirmaciones {
  /** Lo que respondió este dispositivo, o null si todavía no respondió. */
  miRespuesta: TipoConfirmacion | null;
}

@Injectable()
export class ConfirmacionesService {
  constructor(
    @InjectRepository(Confirmacion)
    private readonly confirmacionesRepository: Repository<Confirmacion>,
    @InjectRepository(Bache)
    private readonly bachesRepository: Repository<Bache>,
  ) {}

  async obtener(bacheId: string, dispositivo?: string): Promise<ResumenConfirmacionesDispositivo> {
    await this.asegurarBacheAprobado(bacheId);
    return this.resumenDe(bacheId, dispositivo);
  }

  /** Una respuesta por bache por dispositivo: si ya había respondido, se reemplaza. */
  async confirmar(bacheId: string, tipo: TipoConfirmacion, dispositivo: string): Promise<ResumenConfirmacionesDispositivo> {
    await this.asegurarBacheAprobado(bacheId);
    await this.confirmacionesRepository.upsert({ bacheId, dispositivo, tipo }, ['bacheId', 'dispositivo']);
    return this.resumenDe(bacheId, dispositivo);
  }

  /** Para el panel de admin: conteos de todos los baches que tienen alguna respuesta. */
  async resumenPorBache(): Promise<Record<string, ResumenConfirmaciones>> {
    const filas = await this.confirmacionesRepository
      .createQueryBuilder('c')
      .select('c.bache_id', 'bacheId')
      .addSelect(`COUNT(*) FILTER (WHERE c.tipo = 'sigue')`, 'sigue')
      .addSelect(`COUNT(*) FILTER (WHERE c.tipo = 'arreglado')`, 'arreglado')
      .groupBy('c.bache_id')
      .getRawMany<{ bacheId: string; sigue: string; arreglado: string }>();

    // Postgres devuelve COUNT como string (bigint).
    return Object.fromEntries(
      filas.map((f) => [f.bacheId, { sigue: Number(f.sigue), arreglado: Number(f.arreglado) }]),
    );
  }

  /** Solo se puede opinar sobre lo que está en el mapa público. */
  private async asegurarBacheAprobado(bacheId: string): Promise<void> {
    const existe = await this.bachesRepository.existsBy({ id: bacheId, revisado: true });
    if (!existe) throw new NotFoundException(`No existe un bache con id ${bacheId}`);
  }

  private async resumenDe(bacheId: string, dispositivo?: string): Promise<ResumenConfirmacionesDispositivo> {
    const [sigue, arreglado, mia] = await Promise.all([
      this.confirmacionesRepository.countBy({ bacheId, tipo: 'sigue' }),
      this.confirmacionesRepository.countBy({ bacheId, tipo: 'arreglado' }),
      dispositivo ? this.confirmacionesRepository.findOneBy({ bacheId, dispositivo }) : null,
    ]);
    return { sigue, arreglado, miRespuesta: mia?.tipo ?? null };
  }
}
