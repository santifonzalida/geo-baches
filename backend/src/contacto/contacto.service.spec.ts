import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ContactoService } from './contacto.service';
import { MensajeContacto } from './entities/mensaje-contacto.entity';

// @nestjs/typeorm se publica solo como ESM y jest (CommonJS) no lo puede cargar; acá
// el repositorio se pasa a mano, así que el decorador no hace falta.
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined }));

describe('ContactoService', () => {
  let repo: { insert: jest.Mock; find: jest.Mock; delete: jest.Mock };
  let service: ContactoService;

  beforeEach(() => {
    repo = {
      insert: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    service = new ContactoService(repo as unknown as Repository<MensajeContacto>);
  });

  it('guarda nombre, correo y mensaje', async () => {
    await service.crear({ nombre: 'Ana', email: 'ana@example.com', mensaje: 'Hola' });
    expect(repo.insert).toHaveBeenCalledWith({ nombre: 'Ana', email: 'ana@example.com', mensaje: 'Hola' });
  });

  it('si el campo trampa viene con algo (bot), no guarda', async () => {
    await service.crear({ nombre: 'Bot', email: 'bot@example.com', mensaje: 'spam', sitioWeb: 'http://spam' });
    expect(repo.insert).not.toHaveBeenCalled();
  });

  it('lista los más nuevos primero', async () => {
    await service.listar();
    expect(repo.find).toHaveBeenCalledWith({ order: { fecha: 'DESC' } });
  });

  it('eliminar un mensaje que no existe da 404', async () => {
    repo.delete.mockResolvedValue({ affected: 0 });
    await expect(service.eliminar('x')).rejects.toThrow(NotFoundException);
  });
});
