import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { ApiKeyGuard } from './api-key.guard';

const KEY = 'una-key-de-prueba';
const KEY_HASH = createHash('sha256').update(KEY).digest('hex');

function contexto(apiKey?: string): ExecutionContext {
  const request = {
    method: 'POST',
    originalUrl: '/usuarios',
    ip: '127.0.0.1',
    header: (nombre: string) => (nombre.toLowerCase() === 'x-api-key' ? apiKey : undefined),
  };
  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}

function guard(hash?: string): ApiKeyGuard {
  return new ApiKeyGuard({ get: () => hash } as unknown as ConfigService);
}

describe('ApiKeyGuard', () => {
  it('deja pasar con la key correcta', () => {
    expect(guard(KEY_HASH).canActivate(contexto(KEY))).toBe(true);
  });

  it('acepta el hash configurado en mayúsculas', () => {
    expect(guard(KEY_HASH.toUpperCase()).canActivate(contexto(KEY))).toBe(true);
  });

  it('rechaza una key incorrecta', () => {
    expect(() => guard(KEY_HASH).canActivate(contexto('otra'))).toThrow(UnauthorizedException);
  });

  it('rechaza si falta el header', () => {
    expect(() => guard(KEY_HASH).canActivate(contexto())).toThrow(UnauthorizedException);
  });

  it('rechaza todo si CREATOR_API_KEY_HASH no está configurada', () => {
    expect(() => guard(undefined).canActivate(contexto(KEY))).toThrow(UnauthorizedException);
    expect(() => guard('').canActivate(contexto(''))).toThrow(UnauthorizedException);
  });

  it('rechaza si el hash configurado no es un SHA-256 válido', () => {
    expect(() => guard('no-es-hex').canActivate(contexto(KEY))).toThrow(UnauthorizedException);
  });
});
