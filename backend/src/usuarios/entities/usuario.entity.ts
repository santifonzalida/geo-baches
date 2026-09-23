import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Rol } from './rol.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  /** Login: hoy es el usuario del admin (ej. "admin"); a futuro puede ser el mismo email. */
  @Column({ unique: true })
  usuario: string;

  /** Reservado para el login de vecinos a futuro (recuperar clave, notificaciones). Nulo por ahora. */
  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  nombre: string | null;

  /** Hash de bcrypt. Nulo si la cuenta todavía no tiene contraseña propia (ej. login social a futuro). */
  @Column({ name: 'password_hash', type: 'varchar', nullable: true })
  passwordHash: string | null;

  @ManyToOne(() => Rol, (rol) => rol.usuarios, { eager: true, nullable: false })
  @JoinColumn({ name: 'rol_id' })
  rol: Rol;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;
}
