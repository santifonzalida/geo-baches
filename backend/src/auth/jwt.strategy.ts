import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { NombreRol } from '../usuarios/entities/rol.entity';

export interface JwtPayload {
  sub: string;
  role: NombreRol;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Lo que retorna queda disponible en request.user dentro de los controllers.
  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
