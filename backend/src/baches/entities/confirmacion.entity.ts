import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { Bache } from './bache.entity';

/** 'sigue': el bache sigue ahí. 'arreglado': un vecino avisa que ya lo arreglaron (el admin decide si cambia el estado). */
export const TIPOS_CONFIRMACION = ['sigue', 'arreglado'] as const;
export type TipoConfirmacion = (typeof TIPOS_CONFIRMACION)[number];

/**
 * Respuesta de un vecino a "¿Pasaste por acá?". No hay login: el dispositivo es un
 * UUID que genera el navegador, así que es una respuesta por bache por dispositivo
 * (fácil de saltear borrando datos del navegador; alcanza para un contador orientativo).
 */
@Entity('confirmaciones')
@Unique(['bacheId', 'dispositivo'])
export class Confirmacion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Bache, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bache_id' })
  bache: Bache;

  @Column({ name: 'bache_id' })
  bacheId: string;

  @Column({ type: 'uuid' })
  dispositivo: string;

  @Column({ type: 'enum', enum: TIPOS_CONFIRMACION, enumName: 'confirmaciones_tipo_enum' })
  tipo: TipoConfirmacion;

  @CreateDateColumn({ name: 'fecha' })
  fecha: Date;

  /** Cambia si el vecino cambia de respuesta. */
  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  fechaActualizacion: Date;
}
