import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Mensaje enviado desde el formulario de "Acerca de". Lo lee el admin en su panel. */
@Entity('mensajes_contacto')
export class MensajeContacto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 200 })
  email: string;

  @Column({ type: 'text' })
  mensaje: string;

  @CreateDateColumn({ name: 'fecha' })
  fecha: Date;
}
