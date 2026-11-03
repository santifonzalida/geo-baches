import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { normalizar } from '../usuarios/dto/normalizar';

export class LoginDto {
  /** En minúsculas y sin espacios, igual que se guarda al crear el usuario. */
  @Transform(normalizar)
  @IsString()
  @IsNotEmpty()
  usuario: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
