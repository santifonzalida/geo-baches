import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from './jwt.strategy';
import { ROLES_KEY } from './roles.decorator';
import { NombreRol } from '../usuarios/entities/rol.entity';

/**
 * Va después de JwtAuthGuard (que deja el payload en request.user). Si el
 * endpoint no tiene @Roles(...), deja pasar a cualquier usuario autenticado.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<NombreRol[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const user = context.switchToHttp().getRequest<{ user?: JwtPayload }>().user;
    // Devolver false hace que Nest responda 403 Forbidden.
    return !!user && roles.includes(user.role);
  }
}
