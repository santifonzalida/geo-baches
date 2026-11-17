import { IsIn, IsUUID } from 'class-validator';
import { TIPOS_CONFIRMACION, TipoConfirmacion } from '../entities/confirmacion.entity';

export class ConfirmarDto {
  @IsIn(TIPOS_CONFIRMACION)
  tipo: TipoConfirmacion;

  /** UUID que el navegador genera una vez y guarda (localStorage). */
  @IsUUID()
  dispositivo: string;
}
