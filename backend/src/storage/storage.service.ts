import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'fs';
import { mkdir, stat, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { Readable } from 'stream';
import { UPLOADS_DIR } from '../config/uploads';

export interface ArchivoAlmacenado {
  stream: Readable;
  contentType: string;
}

const TIPOS: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/**
 * Almacenamiento de fotos. Con las variables S3_* usa un bucket S3-compatible
 * (Railway Bucket); sin ellas cae al disco local (backend/uploads), útil en desarrollo.
 * Los buckets de Railway son privados: las fotos se sirven vía UploadsController.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: string | undefined;
  private readonly s3: S3Client | null;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET') || undefined;
    this.s3 = this.bucket
      ? new S3Client({
          endpoint: config.getOrThrow<string>('S3_ENDPOINT'),
          region: config.get<string>('S3_REGION') || 'auto',
          forcePathStyle: config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
          credentials: {
            accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
            secretAccessKey: config.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
          },
        })
      : null;
  }

  async onModuleInit(): Promise<void> {
    if (this.s3) {
      this.logger.log(`Fotos en bucket S3 "${this.bucket}"`);
    } else {
      await mkdir(UPLOADS_DIR, { recursive: true });
      this.logger.warn('S3_BUCKET no configurado: las fotos se guardan en disco local (solo para desarrollo)');
    }
  }

  async guardar(nombre: string, contenido: Buffer, contentType: string): Promise<void> {
    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({ Bucket: this.bucket, Key: nombre, Body: contenido, ContentType: contentType }),
      );
    } else {
      await writeFile(join(UPLOADS_DIR, nombre), contenido);
    }
  }

  /** Devuelve null si la foto no existe. */
  async obtener(nombre: string): Promise<ArchivoAlmacenado | null> {
    const contentType = TIPOS[extname(nombre).toLowerCase()] ?? 'application/octet-stream';

    if (this.s3) {
      try {
        const { Body } = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: nombre }));
        return Body ? { stream: Body as Readable, contentType } : null;
      } catch (error) {
        if ((error as { name?: string }).name === 'NoSuchKey') return null;
        throw error;
      }
    }

    const ruta = join(UPLOADS_DIR, nombre);
    try {
      await stat(ruta);
    } catch {
      return null;
    }
    return { stream: createReadStream(ruta), contentType };
  }
}
