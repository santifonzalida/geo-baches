import { IsIn } from 'class-validator';
import { ESTADOS_VALIDOS, EstadoBache } from '../entities/bache.entity';

export class UpdateEstadoDto {
  @IsIn(ESTADOS_VALIDOS)
  estado: EstadoBache;
}
