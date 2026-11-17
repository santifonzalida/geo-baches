import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  ConfirmacionesService,
  ResumenConfirmaciones,
  ResumenConfirmacionesDispositivo,
} from './confirmaciones.service';
import { ConfirmarDto } from './dto/confirmar.dto';

@Controller('baches')
export class ConfirmacionesController {
  constructor(private readonly confirmacionesService: ConfirmacionesService) {}

  /** Admin: cuántos vecinos dicen "sigue ahí" / "ya lo arreglaron", por bache. */
  @Get('confirmaciones/resumen')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  resumen(): Promise<Record<string, ResumenConfirmaciones>> {
    return this.confirmacionesService.resumenPorBache();
  }

  @Get(':id/confirmaciones')
  obtener(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('dispositivo', new ParseUUIDPipe({ optional: true })) dispositivo?: string,
  ): Promise<ResumenConfirmacionesDispositivo> {
    return this.confirmacionesService.obtener(id, dispositivo);
  }

  @Post(':id/confirmaciones')
  confirmar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmarDto,
  ): Promise<ResumenConfirmacionesDispositivo> {
    return this.confirmacionesService.confirmar(id, dto.tipo, dto.dispositivo);
  }
}
