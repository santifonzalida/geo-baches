import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from './usuario.entity';

/** 'vecino' no se usa todavía (login de usuarios casuales queda para más adelante). */
export const NOMBRES_ROL = ['admin', 'vecino'] as const;
export type NombreRol = (typeof NOMBRES_ROL)[number];

@Entity('roles')
export class Rol {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nombre: NombreRol;

  @OneToMany(() => Usuario, (usuario) => usuario.rol)
  usuarios: Usuario[];
}
