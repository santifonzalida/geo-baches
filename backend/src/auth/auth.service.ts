import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';

/**
 * Hash de relleno con formato válido de bcrypt (no corresponde a ninguna
 * contraseña real). Se compara contra esto cuando el usuario no existe o no
 * tiene contraseña, para que bcrypt haga el mismo trabajo costoso en todos
 * los casos y el tiempo de respuesta no delate si el usuario existe.
 */
const HASH_RELLENO = '$2b$10$bMJt/sKJZOq.uAahtnY7oei/lGn60XILb7mOORm53IpwJyfP/5ULW';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usuariosService: UsuariosService,
  ) {}

  async login(usuario: string, password: string): Promise<{ accessToken: string }> {
    const encontrado = await this.usuariosService.findByUsuario(usuario);
    const hashParaComparar = encontrado?.passwordHash ?? HASH_RELLENO;

    const passwordOk = await bcrypt.compare(password, hashParaComparar);
    if (!passwordOk || !encontrado || !encontrado.activo) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const accessToken = await this.jwtService.signAsync({ sub: encontrado.usuario, role: encontrado.rol.nombre });
    return { accessToken };
  }
}
