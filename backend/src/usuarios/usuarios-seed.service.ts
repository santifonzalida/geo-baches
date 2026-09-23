import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NombreRol, Rol } from './entities/rol.entity';
import { Usuario } from './entities/usuario.entity';

/**
 * Al arrancar: asegura que existan los roles base y, si todavía no hay un
 * usuario admin en la tabla, lo crea a partir de ADMIN_USER/ADMIN_PASSWORD_HASH
 * (las mismas variables que antes usaba el login directamente). Es idempotente:
 * en cada arranque solo crea lo que falta.
 */
@Injectable()
export class UsuariosSeedService implements OnModuleInit {
  private readonly logger = new Logger(UsuariosSeedService.name);

  constructor(
    @InjectRepository(Rol)
    private readonly rolesRepository: Repository<Rol>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const rolAdmin = await this.asegurarRol('admin');
    await this.asegurarRol('vecino');
    await this.asegurarAdmin(rolAdmin);
  }

  private async asegurarRol(nombre: NombreRol): Promise<Rol> {
    const existente = await this.rolesRepository.findOneBy({ nombre });
    if (existente) return existente;

    const creado = await this.rolesRepository.save(this.rolesRepository.create({ nombre }));
    this.logger.log(`Rol "${nombre}" creado`);
    return creado;
  }

  private async asegurarAdmin(rolAdmin: Rol): Promise<void> {
    const usuario = this.config.get<string>('ADMIN_USER');
    const passwordHash = this.config.get<string>('ADMIN_PASSWORD_HASH');
    if (!usuario || !passwordHash) {
      this.logger.warn('ADMIN_USER/ADMIN_PASSWORD_HASH no configuradas: no se siembra ningún admin');
      return;
    }

    const existente = await this.usuariosRepository.findOneBy({ usuario });
    if (existente) return;

    await this.usuariosRepository.save(
      this.usuariosRepository.create({ usuario, passwordHash, rol: rolAdmin, activo: true }),
    );
    this.logger.log(`Usuario admin "${usuario}" creado a partir de las variables de entorno`);
  }
}
