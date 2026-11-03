import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from './jwt.strategy';
import { RolesGuard } from './roles.guard';
import { NombreRol } from '../usuarios/entities/rol.entity';

function contexto(user?: JwtPayload): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guard(roles?: NombreRol[]): RolesGuard {
  return new RolesGuard({ getAllAndOverride: () => roles } as unknown as Reflector);
}

describe('RolesGuard', () => {
  it('deja pasar a un admin en un endpoint de admin', () => {
    expect(guard(['admin']).canActivate(contexto({ sub: 'admin', role: 'admin' }))).toBe(true);
  });

  it('rechaza a un vecino en un endpoint de admin', () => {
    expect(guard(['admin']).canActivate(contexto({ sub: 'juan', role: 'vecino' }))).toBe(false);
  });

  it('rechaza si no hay usuario en el request', () => {
    expect(guard(['admin']).canActivate(contexto())).toBe(false);
  });

  it('deja pasar si el endpoint no declara roles', () => {
    expect(guard(undefined).canActivate(contexto({ sub: 'juan', role: 'vecino' }))).toBe(true);
  });
});
