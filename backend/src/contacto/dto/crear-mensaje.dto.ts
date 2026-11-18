import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const recortar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CrearMensajeDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty({ message: 'Contanos tu nombre' })
  @MaxLength(100)
  nombre: string;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @MaxLength(200)
  email: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty({ message: 'Escribí un mensaje' })
  @MaxLength(2000, { message: 'El mensaje puede tener hasta 2000 caracteres' })
  mensaje: string;

  /**
   * Trampa para bots: el campo está oculto en el formulario, una persona lo deja vacío.
   * Si viene con algo, se responde OK pero no se guarda.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  sitioWeb?: string;
}
