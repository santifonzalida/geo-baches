import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import { Request } from 'express';

/**
 * Protege endpoints de uso exclusivo del creador de la app (ej. crear usuarios).
 * Espera la key en el header X-Api-Key. CREATOR_API_KEY_HASH guarda el SHA-256
 * (hex) de la key, no la key en sí, así verla en el dashboard no alcanza para usarla.
 * Sin la variable configurada, rechaza todo.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const hashEsperado = this.config.get<string>('CREATOR_API_KEY_HASH')?.trim().toLowerCase();
    const key = request.header('x-api-key');

    if (!hashEsperado || !key || !this.coincide(key, hashEsperado)) {
      this.logger.warn(`API key inválida o ausente en ${request.method} ${request.originalUrl} desde ${request.ip}`);
      throw new UnauthorizedException();
    }
    return true;
  }

  private coincide(key: string, hashEsperado: string): boolean {
    // Comparar hashes de largo fijo permite usar timingSafeEqual sin filtrar el largo de la key.
    const recibido = createHash('sha256').update(key).digest();
    const esperado = Buffer.from(hashEsperado, 'hex');
    return esperado.length === recibido.length && timingSafeEqual(recibido, esperado);
  }
}
