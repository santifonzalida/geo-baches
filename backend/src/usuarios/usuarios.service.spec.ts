import { BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { QueryFailedError, Repository } from 'typeorm';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { Rol } from './entities/rol.entity';
import { Usuario } from './entities/usuario.entity';
import { UsuariosService } from './usuarios.service';

// @nestjs/typeorm se publica solo como ESM y jest (CommonJS) no lo puede cargar; acá
// los repositorios se pasan a mano, así que el decorador no hace falta.
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined }));

const ROL_ADMIN = { id: 1, nombre: 'admin' } as Rol;
const DTO: CrearUsuarioDto = { usuario: 'juan', password: 'clave-segura', rol: 'admin' };

describe('UsuariosService.crear', () => {
  let usuariosRepository: { findOneBy: jest.Mock; create: jest.Mock; save: jest.Mock };
  let rolesRepository: { findOneBy: jest.Mock };
  let service: UsuariosService;

  beforeEach(() => {
    usuariosRepository = {
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn((datos: Partial<Usuario>) => datos),
      save: jest.fn(async (u: Partial<Usuario>) => ({ ...u, id: 7, fechaCreacion: new Date('2026-11-03') })),
    };
    rolesRepository = { findOneBy: jest.fn().mockResolvedValue(ROL_ADMIN) };
    service = new UsuariosService(
      usuariosRepository as unknown as Repository<Usuario>,
      rolesRepository as unknown as Repository<Rol>,
    );
  });

  it('crea el usuario con la contraseña hasheada y no devuelve el hash', async () => {
    const resultado = await service.crear(DTO);

    const guardado = usuariosRepository.save.mock.calls[0][0] as Usuario;
    expect(guardado.passwordHash).not.toBe(DTO.password);
    expect(await bcrypt.compare(DTO.password, guardado.passwordHash!)).toBe(true);
    expect(guardado.activo).toBe(true);

    expect(resultado).toEqual({
      id: 7,
      usuario: 'juan',
      email: null,
      nombre: null,
      rol: 'admin',
      activo: true,
      fechaCreacion: new Date('2026-11-03'),
    });
    expect(resultado).not.toHaveProperty('passwordHash');
  });

  it('falla con 409 si el usuario ya existe', async () => {
    usuariosRepository.findOneBy.mockResolvedValue({ id: 1 } as Usuario);
    await expect(service.crear(DTO)).rejects.toThrow(ConflictException);
    expect(usuariosRepository.save).not.toHaveBeenCalled();
  });

  it('falla con 409 si el unique de la tabla corta un alta simultánea', async () => {
    usuariosRepository.save.mockRejectedValue(new QueryFailedError('INSERT', [], { code: '23505' } as unknown as Error));
    await expect(service.crear(DTO)).rejects.toThrow(ConflictException);
  });

  it('falla con 400 si el rol no existe en la tabla', async () => {
    rolesRepository.findOneBy.mockResolvedValue(null);
    await expect(service.crear(DTO)).rejects.toThrow(BadRequestException);
  });
});
