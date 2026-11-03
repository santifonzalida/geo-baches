import { plainToInstance } from 'class-transformer';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  it('pasa el usuario a minúsculas y le saca los espacios', () => {
    const dto = plainToInstance(LoginDto, { usuario: '  Admin ', password: 'Clave' });
    expect(dto.usuario).toBe('admin');
    // La contraseña no se toca.
    expect(dto.password).toBe('Clave');
  });
});
