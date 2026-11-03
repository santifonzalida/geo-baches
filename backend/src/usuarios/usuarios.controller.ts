import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { UsuarioPublico, UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  /** Solo para el creador de la app (header X-Api-Key). Permite crear usuarios de cualquier rol. */
  @Post()
  @UseGuards(ApiKeyGuard)
  crear(@Body() dto: CrearUsuarioDto): Promise<UsuarioPublico> {
    return this.usuariosService.crear(dto);
  }
}
