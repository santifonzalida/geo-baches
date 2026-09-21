import { IsIn } from 'class-validator';
import { EstadoBache } from '../entities/bache.entity';

export class UpdateEstadoDto {
  @IsIn(['reportado', 'en-reparacion', 'reparado'])
  estado: EstadoBache;
}
