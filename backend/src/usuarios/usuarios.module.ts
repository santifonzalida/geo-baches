import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rol } from './entities/rol.entity';
import { Usuario } from './entities/usuario.entity';
import { UsuariosSeedService } from './usuarios-seed.service';
import { UsuariosService } from './usuarios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Rol])],
  providers: [UsuariosService, UsuariosSeedService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
