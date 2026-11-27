import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { ESTADOS_VALIDOS, EstadoBache, SeveridadBache } from '../entities/bache.entity';

export class CreateBacheDto {
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @Type(() => Number)
  @IsNumber()
  lng: number;

  @IsIn(ESTADOS_VALIDOS)
  estado: EstadoBache;

  @IsIn(['baja', 'media', 'alta'])
  severidad: SeveridadBache;

  @IsNotEmpty()
  @MaxLength(100)
  usuario: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  calle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  altura?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  barrio?: string;
}
