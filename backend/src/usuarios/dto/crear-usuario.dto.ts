import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { NOMBRES_ROL, NombreRol } from '../entities/rol.entity';
import { normalizar } from './normalizar';

export class CrearUsuarioDto {
  /** Se guarda en minúsculas y sin espacios para que "Admin" y "admin" no sean dos cuentas. */
  @Transform(normalizar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  usuario: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt ignora lo que pase de 72 bytes
  password: string;

  @IsIn(NOMBRES_ROL)
  rol: NombreRol;

  @IsOptional()
  @Transform(normalizar)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre?: string;
}
