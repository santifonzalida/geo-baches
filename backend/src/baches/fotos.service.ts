import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { StorageService } from '../storage/storage.service';

/** La foto solo se ve en ventanas chicas (popup, miniatura del panel): con esto sobra. */
const LADO_MAX = 1280;
const CALIDAD_JPEG = 78;

@Injectable()
export class FotosService {
  private readonly logger = new Logger(FotosService.name);

  constructor(private readonly storage: StorageService) {}

  /**
   * Guarda la foto ya procesada y devuelve su URL pública. Independiente de lo que
   * haya hecho el cliente: reduce el tamaño, corrige la orientación y descarta los
   * metadatos EXIF (incluida la ubicación GPS del celular).
   */
  async guardar(foto: Express.Multer.File): Promise<string> {
    const esGif = foto.mimetype === 'image/gif';
    const extension = esGif ? 'gif' : 'jpg';

    try {
      const base = sharp(foto.buffer, { animated: esGif })
        .rotate()
        .resize({ width: LADO_MAX, height: LADO_MAX, fit: 'inside', withoutEnlargement: true });

      // PNG/WebP con transparencia: sin aplanar, el fondo saldría negro en JPEG.
      const procesada = esGif
        ? await base.gif().toBuffer()
        : await base.flatten({ background: '#ffffff' }).jpeg({ quality: CALIDAD_JPEG, mozjpeg: true }).toBuffer();

      const nombre = `${randomUUID()}.${extension}`;
      await this.storage.guardar(nombre, procesada, esGif ? 'image/gif' : 'image/jpeg');
      return `/uploads/${nombre}`;
    } catch (error) {
      this.logger.warn(`No se pudo procesar la foto: ${(error as Error).message}`);
      throw new BadRequestException('No se pudo procesar la foto: el archivo no es una imagen válida.');
    }
  }
}
