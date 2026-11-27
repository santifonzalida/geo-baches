import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type EstadoBache = 'reportado' | 'reparado';
export type SeveridadBache = 'baja' | 'media' | 'alta';

/** Los estados que acepta la API. "En obra" (en-reparacion) ya no se usa. */
export const ESTADOS_VALIDOS: EstadoBache[] = ['reportado', 'reparado'];

@Entity('baches')
export class Bache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('double precision')
  lat: number;

  @Column('double precision')
  lng: number;

  @Column({
    type: 'enum',
    // 'en-reparacion' queda en el enum de Postgres a propósito: con synchronize, sacarlo
    // haría que TypeORM recree el tipo y falle el arranque si alguna fila todavía lo tiene.
    enum: ['reportado', 'en-reparacion', 'reparado'],
    default: 'reportado',
  })
  estado: EstadoBache;

  @Column({
    type: 'enum',
    enum: ['baja', 'media', 'alta'],
    enumName: 'baches_severidad_enum',
    default: 'media',
  })
  severidad: SeveridadBache;

  @Column()
  usuario: string;

  @Column({ type: 'varchar', nullable: true })
  calle: string | null;

  @Column({ type: 'varchar', nullable: true })
  altura: string | null;

  @Column({ type: 'varchar', nullable: true })
  barrio: string | null;

  @Column({ type: 'varchar', name: 'foto_url', nullable: true })
  fotoUrl: string | null;

  /** Moderación: un bache nuevo arranca sin revisar y no se muestra en el mapa público hasta que un revisor lo aprueba. */
  @Column({ default: false })
  revisado: boolean;

  @CreateDateColumn({ name: 'fecha' })
  fecha: Date;
}
