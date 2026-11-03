import { SetMetadata } from '@nestjs/common';
import { NombreRol } from '../usuarios/entities/rol.entity';

export const ROLES_KEY = 'roles';

/** Roles que pueden usar el endpoint. Se usa junto con JwtAuthGuard + RolesGuard. */
export const Roles = (...roles: NombreRol[]) => SetMetadata(ROLES_KEY, roles);
