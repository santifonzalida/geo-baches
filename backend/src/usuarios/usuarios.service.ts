import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { QueryFailedError, Repository } from 'typeorm';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { NombreRol, Rol } from './entities/rol.entity';
import { Usuario } from './entities/usuario.entity';

/** Lo que se expone de un usuario: nunca el passwordHash. */
export interface UsuarioPublico {
  id: number;
  usuario: string;
  email: string | null;
  nombre: string | null;
  rol: NombreRol;
  activo: boolean;
  fechaCreacion: Date;
}

/** Código de Postgres para violación de unique. */
const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolesRepository: Repository<Rol>,
  ) {}

  findByUsuario(usuario: string): Promise<Usuario | null> {
    return this.usuariosRepository.findOneBy({ usuario });
  }

  async crear(dto: CrearUsuarioDto): Promise<UsuarioPublico> {
    const rol = await this.rolesRepository.findOneBy({ nombre: dto.rol });
    if (!rol) throw new BadRequestException(`El rol "${dto.rol}" no existe`);

    if (await this.findByUsuario(dto.usuario)) {
      throw new ConflictException(`El usuario "${dto.usuario}" ya existe`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      const creado = await this.usuariosRepository.save(
        this.usuariosRepository.create({
          usuario: dto.usuario,
          passwordHash,
          email: dto.email ?? null,
          nombre: dto.nombre ?? null,
          rol,
          activo: true,
        }),
      );
      return this.aPublico(creado);
    } catch (error) {
      // Dos pedidos simultáneos con el mismo usuario pasan el chequeo de arriba; el unique de la tabla corta al segundo.
      if (error instanceof QueryFailedError && (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException(`El usuario "${dto.usuario}" ya existe`);
      }
      throw error;
    }
  }

  private aPublico(usuario: Usuario): UsuarioPublico {
    return {
      id: usuario.id,
      usuario: usuario.usuario,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol.nombre,
      activo: usuario.activo,
      fechaCreacion: usuario.fechaCreacion,
    };
  }
}
