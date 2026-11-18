import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ContactoService } from './contacto.service';
import { CrearMensajeDto } from './dto/crear-mensaje.dto';
import { MensajeContacto } from './entities/mensaje-contacto.entity';

@Controller('contacto')
export class ContactoController {
  constructor(private readonly contactoService: ContactoService) {}

  /** Público: formulario de "Acerca de". */
  @Post()
  @HttpCode(204)
  crear(@Body() dto: CrearMensajeDto): Promise<void> {
    return this.contactoService.crear(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  listar(): Promise<MensajeContacto[]> {
    return this.contactoService.listar();
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  eliminar(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.contactoService.eliminar(id);
  }
}
