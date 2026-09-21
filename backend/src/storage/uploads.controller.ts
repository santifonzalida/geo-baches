import { Controller, Get, NotFoundException, Param, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { StorageService } from './storage.service';

/** Solo nombres generados por el servidor (UUID.ext): evita path traversal y claves arbitrarias. */
const NOMBRE_VALIDO = /^[A-Za-z0-9-]+\.(jpe?g|png|gif|webp)$/i;

@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Get(':nombre')
  async obtener(
    @Param('nombre') nombre: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!NOMBRE_VALIDO.test(nombre)) throw new NotFoundException();

    const archivo = await this.storage.obtener(nombre);
    if (!archivo) throw new NotFoundException();

    res.set({
      'Content-Type': archivo.contentType,
      // El nombre es un UUID y la foto nunca se modifica: el navegador puede cachearla para siempre.
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    return new StreamableFile(archivo.stream);
  }
}
